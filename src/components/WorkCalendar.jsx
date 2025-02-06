import { useState, useEffect } from "react";
import ActivityCalendar from "react-activity-calendar";
import { timestampToDateString } from "../utils/time";

// Font Awesome 图标
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSignInAlt, // 上班
  faSignOutAlt, // 下班
  faCoffee, // 休息开始/结束
  faTrashAlt, // 删除
  faCalendar, // 日历
} from "@fortawesome/free-solid-svg-icons";

// IndexedDB 操作（注意这里引入了 deleteEvent）
import { getAllEvents, deleteEvent } from "../store/db";

// ----- 以下为工作时长计算的辅助函数 ----- //

/**
 * 根据所有事件构造出工作时间段
 * 每个时间段为“上班（shukkin）”到“下班（taikin）”之间，
 * 并排除期间的休息（kyuukeikaishi/kyuukeishuuryou）。
 */
function computeWorkSegments(events) {
  // 按时间排序
  const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
  let segments = [];
  let currentClockIn = null;
  let breakIntervals = [];
  let currentBreakStart = null;
  sortedEvents.forEach((event) => {
    switch (event.type) {
      case "shukkin":
        currentClockIn = event.timestamp;
        breakIntervals = [];
        currentBreakStart = null;
        break;
      case "kyuukeikaishi":
        if (currentClockIn !== null) {
          currentBreakStart = event.timestamp;
        }
        break;
      case "kyuukeishuuryou":
        if (currentClockIn !== null && currentBreakStart !== null) {
          breakIntervals.push({
            start: currentBreakStart,
            end: event.timestamp,
          });
          currentBreakStart = null;
        }
        break;
      case "taikin":
        if (currentClockIn !== null) {
          const clockIn = currentClockIn;
          const clockOut = event.timestamp;
          let segmentStart = clockIn;
          // 若存在休息，按顺序将工作时间段分割
          breakIntervals
            .sort((a, b) => a.start - b.start)
            .forEach((br) => {
              if (br.start > segmentStart && br.start < clockOut) {
                segments.push({ start: segmentStart, end: br.start });
                segmentStart = br.end;
              }
            });
          if (segmentStart < clockOut) {
            segments.push({ start: segmentStart, end: clockOut });
          }
          // 重置状态
          currentClockIn = null;
          breakIntervals = [];
          currentBreakStart = null;
        }
        break;
      default:
        break;
    }
  });
  return segments;
}

/**
 * 将单个工作时间段拆分到各个日历天上
 * 例如：如果一个工作时间段跨天，则按每一天拆分相应的时长（单位：毫秒）。
 * 此处统一采用计算机所在的本地时间（时区）。
 */
function allocateSegmentToDays(segment) {
  const allocations = {};
  let s = segment.start;
  const e = segment.end;
  while (s < e) {
    const sDate = new Date(s);
    // 使用本地日期字符串，格式："YYYY-MM-DD"
    const dayString = `${sDate.getFullYear()}-${(sDate.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${sDate.getDate().toString().padStart(2, "0")}`;
    // 计算当前天结束时刻（本地时间下的次日 0 点）
    const nextDay = new Date(
      sDate.getFullYear(),
      sDate.getMonth(),
      sDate.getDate() + 1
    );
    const boundary = nextDay.getTime();
    const segmentEnd = Math.min(e, boundary);
    const duration = segmentEnd - s;
    allocations[dayString] = (allocations[dayString] || 0) + duration;
    s = segmentEnd;
  }
  return allocations;
}

/**
 * 根据所选年份和所有事件，计算出每一天的工作时长（单位：小时，四舍五入为整数）
 * 同时将缺失的天数补齐（工作时长为 0）。
 * 此处日期均采用计算机所在的本地时间。
 */
function computeCalendarData(year, events) {
  // 计算所有工作时间段
  const segments = computeWorkSegments(events);
  // 汇总每天的工作时长（单位：毫秒）
  const dailyDurations = {};
  segments.forEach((segment) => {
    const allocations = allocateSegmentToDays(segment);
    for (const day in allocations) {
      // 解析本地日期字符串
      const [y] = day.split("-").map(Number);
      if (y === year) {
        dailyDurations[day] = (dailyDurations[day] || 0) + allocations[day];
      }
    }
  });
  // 构造所选年份中每一天的数据（均使用本地时间）
  const result = [];
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateString = `${d.getFullYear()}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
    const durationMs = dailyDurations[dateString] || 0;
    const hours = Math.round(durationMs / 1000 / 60 / 60);
    // 等级为4档，0-3小时为0级，3-6小时为1级，6-9小时为2级，9小时以上为3级
    if (hours === 0 && durationMs === 0) {
      result.push({ date: dateString, count: 0, level: 0 });
    } else if (hours < 3 && durationMs > 0) {
      result.push({ date: dateString, count: Math.round(hours), level: 1 });
    } else if (hours < 6) {
      result.push({ date: dateString, count: Math.round(hours), level: 2 });
    } else if (hours < 9) {
      result.push({ date: dateString, count: Math.round(hours), level: 3 });
    } else {
      result.push({ date: dateString, count: Math.round(hours), level: 4 });
    }
  }
  return result;
}

/**
 * 根据事件类型返回对应的图标及文字说明
 */
function renderEventIcon(type) {
  switch (type) {
    case "shukkin":
      return (
        <span className="text-green-500 flex items-center">
          <span className="w-8">
            <FontAwesomeIcon icon={faSignInAlt} className="mr-1" />
          </span>
          <span className="w-16">出勤</span>
        </span>
      );
    case "taikin":
      return (
        <span className="text-red-500 flex items-center">
          <span className="w-8">
            <FontAwesomeIcon icon={faSignOutAlt} className="mr-1" />
          </span>
          <span className="w-16">退勤</span>
        </span>
      );
    case "kyuukeikaishi":
      return (
        <span className="text-blue-500 flex items-center">
          <span className="w-8">
            <FontAwesomeIcon icon={faCoffee} className="mr-1" />
          </span>
          <span className="w-16">休憩開始</span>
        </span>
      );
    case "kyuukeishuuryou":
      return (
        <span className="text-orange-500 flex items-center">
          <span className="w-8">
            <FontAwesomeIcon icon={faCoffee} className="mr-1" />
          </span>
          <span className="w-16">休憩終了</span>
        </span>
      );
    default:
      return type;
  }
}

/**
 * 自定义确认弹窗组件
 */
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.5)]">
      <div className="bg-white p-6 rounded shadow-md">
        <div className="mb-4 text-lg">{message}</div>
        <div className="flex justify-end">
          <button
            className="mr-2 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700 cursor-pointer"
            onClick={onCancel}
          >
            取消
          </button>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 cursor-pointer"
            onClick={onConfirm}
          >
            确定
          </button>
        </div>
      </div>
    </div>
  );
}

function WorkCalendar({ status }) {
  // 本组件内部维护所有事件的状态（从 IndexedDB 中加载）
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [allEvents, setAllEvents] = useState([]);
  // 默认显示当前年份，用户可通过下拉框切换年份
  const currentYear = new Date().getFullYear();
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [selectedYear, setSelectedYear] = useState(currentYear);
  // 控制自定义确认弹窗
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [confirmModal, setConfirmModal] = useState(null);

  // 从 IndexedDB 中获取所有事件
  const refreshEvents = () => {
    getAllEvents().then((events) => setAllEvents(events));
  };

  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => {
    refreshEvents();
  }, [status]);

  // 根据所选年份和所有事件构造 ActivityCalendar 所需的数据
  const calendarData = computeCalendarData(selectedYear, allEvents);

  // 时间线中使用所有事件（按时间排序）
  const sortedEvents = [...allEvents].sort((a, b) => b.timestamp - a.timestamp);

  // 单条事件删除
  const handleDeleteEvent = (id) => {
    deleteEvent(id).then(() => refreshEvents());
  };

  // 删除所有事件
  const handleDeleteAll = () => {
    Promise.all(allEvents.map((event) => deleteEvent(event.id))).then(() =>
      refreshEvents()
    );
  };

  // 构造年份下拉框选项（例如：当前年份前后 5 年范围）
  const yearOptions = [];
  for (let y = currentYear - 5; y <= currentYear + 1; y++) {
    yearOptions.push(y);
  }

  // 渲染时间线：遍历所有事件，当日期发生变化时显示一个日期标记
  const renderTimeline = () => {
    const timelineElements = [];
    let lastDate = "";
    let cnt = 0;
    sortedEvents.forEach((event) => {
      // 不属于当前年份的，不显示
      if (new Date(event.timestamp).getFullYear() !== selectedYear) {
        return;
      }

      const eventDate = timestampToDateString(event.timestamp, false);
      if (eventDate !== lastDate) {
        timelineElements.push(
          <div
            key={`day-${eventDate}`}
            className="text-gray-700 font-bold mt-4"
          >
            <FontAwesomeIcon icon={faCalendar} className="mr-2" />
            {eventDate}
          </div>
        );
        lastDate = eventDate;
      }
      timelineElements.push(
        <div
          key={event.id}
          className={`flex items-center justify-between py-1 m-0 pl-2 pr-2 ${
            cnt % 2 === 0 ? "bg-gray-100" : ""
          }`}
        >
          <div className="flex items-center">
            {renderEventIcon(event.type)}
            <span className="ml-6 text-gray-600">
              {timestampToDateString(event.timestamp)}
            </span>
          </div>
          <button
            onClick={() =>
              setConfirmModal({
                message: "确定要删除这条记录吗？",
                onConfirm: () => {
                  handleDeleteEvent(event.id);
                  setConfirmModal(null);
                },
                onCancel: () => setConfirmModal(null),
              })
            }
            className="text-red-500 hover:text-red-700 cursor-pointer"
          >
            <FontAwesomeIcon icon={faTrashAlt} />
          </button>
        </div>
      );
      cnt++;
    });

    // 如果没有事件，则显示提示信息
    if (sortedEvents.length === 0) {
      timelineElements.push(
        <div
          key="no-events"
          className="text-gray-500 flex items-center justify-center min-h-[200px] bg-gray-50"
        >
          <span>暂无打卡记录</span>
        </div>
      );
    }

    return timelineElements;
  };

  return (
    <div className="mt-8">
      <h2 className="text-2xl font-bold mb-4">考勤管理</h2>

      {/* 年份选择 */}
      <div className="mb-4">
        <label className="mr-2 font-bold" htmlFor="year-select">
          年份:
        </label>
        <select
          id="year-select"
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="border rounded px-2 py-1"
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}年
            </option>
          ))}
        </select>
      </div>

      {/* ====== 上方：热力图（ActivityCalendar） ====== */}
      <div className="bg-white p-4 rounded shadow mb-6 flex items-center justify-center">
        {calendarData?.length > 0 && (
          <ActivityCalendar
            data={calendarData}
            labels={{
              legend: {
                less: "少",
                more: "多",
              },
              months: [
                "1月",
                "2月",
                "3月",
                "4月",
                "5月",
                "6月",
                "7月",
                "8月",
                "9月",
                "10月",
                "11月",
                "12月",
              ],
              weekdays: ["日", "一", "二", "三", "四", "五", "六"],
              totalCount: "{{year}} 年累计出勤 {{count}} 小时",
            }}
          />
        )}
      </div>

      {/* ====== 下方：打卡记录 ====== */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="text-xl font-bold mb-4">打卡记录</h3>
        <div className="space-y-2">{renderTimeline()}</div>
        {/* 删除所有按钮 */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() =>
              setConfirmModal({
                message: "确定要删除所有记录吗？",
                onConfirm: () => {
                  handleDeleteAll();
                  setConfirmModal(null);
                },
                onCancel: () => setConfirmModal(null),
              })
            }
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            删除所有
          </button>
        </div>
      </div>

      {/* 如果需要显示确认弹窗，则渲染 */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}
    </div>
  );
}

export default WorkCalendar;
