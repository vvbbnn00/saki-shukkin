import { useState, useEffect } from "react";
import ImageOverlay from "./components/ImageOverlay";
import WorkCalendar from "./components/WorkCalendar";
import { addEvent, getAllEvents } from "./store/db";

// 以下四张图片尺寸均为 1380 x 780
import shukkinImg from "/出勤.png";
import taikinImg from "/退勤.png";
import kyuukeikaishiImg from "/休憩開始.png";
import kyuukeishuuryouImg from "/休憩終了.png";
import CurrentTime from "./components/time/CurrentTime";
import Footer from "./components/Footer";
// import generateAttendanceLogs from "./test/generate2024";

const images = {
  shukkin: shukkinImg,
  taikin: taikinImg,
  kyuukeikaishi: kyuukeikaishiImg,
  kyuukeishuuryou: kyuukeishuuryouImg,
};

function App() {
  // 初始状态为“出勤”
  const [status, setStatus] = useState("taikin");
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

  // generateAttendanceLogs().forEach((event) => {
  //   addEvent(event);
  // });

  useEffect(() => {
    // 预加载所有图片（用于手机端、电脑端自适应显示时保证缓存齐全）
    let loadedCount = 0;
    Object.values(images).forEach((src) => {
      const img = new Image();
      img.src = src;
      img.onload = () => {
        loadedCount++;
        if (loadedCount === Object.values(images).length) {
          setLoading(false);
        }
      };
    });
    // 加载 IndexedDB 中的所有事件记录
    getAllEvents().then(setEvents);
  }, []);

  // 如果 events 变化，重新计算状态
  useEffect(() => {
    if (events.length > 0) {
      const lastEvent = events[events.length - 1];
      if (lastEvent.type === "kyuukeishuuryou") {
        // 如果最后一个事件是休息结束，则自动切换回出勤状态
        setStatus("shukkin");
      } else {
        setStatus(lastEvent.type);
      }
    }
  }, [events]);

  // 点击按钮时处理状态切换并记录事件
  const handleButtonClick = (newStatus) => {
    // 根据出勤逻辑做简单校验：
    // － 退勤（taikin）只有在出勤后或休息结束后才能点击
    // － 休息开始（kyuukeikaishi）只有在出勤后才能点击
    // － 休息结束（kyuukeishuuryou）只有在休息开始后才能点击
    if (newStatus === "taikin") {
      if (status !== "shukkin" && status !== "kyuukeishuuryou") {
        return;
      }
    }
    if (newStatus === "kyuukeikaishi") {
      if (status !== "shukkin" && status !== "kyuukeishuuryou") {
        return;
      }
    }
    if (newStatus === "kyuukeishuuryou") {
      if (status !== "kyuukeikaishi") {
        return;
      }
    }
    const timestamp = Date.now();
    addEvent({ type: newStatus, timestamp }).then(() => {
      // 重新获取所有事件
      getAllEvents().then(setEvents);
    });
    setStatus(newStatus);

    // 如果是休息结束，等待 1 秒后自动切换回出勤状态
    if (newStatus === "kyuukeishuuryou") {
      setTimeout(() => {
        setStatus("shukkin");
      }, 500);
    }
  };

  return (
    <div className="container mx-auto p-4 pb-0 px-0">
      <div>
        {loading ? (
          <div className="text-center text-xl">読み込み中...</div>
        ) : (
          <div className="max-w-[1024px] w-full mx-auto px-2">
            <h1 className="text-gray-700 font-bold text-4xl text-center mt-4 mb-8">
              祥、出勤
            </h1>
            <div
              className="relative mx-auto select-none px-2"
              style={{ maxWidth: "1024px" }}
            >
              <div className="rounded overflow-hidden">
                <img
                  src={images[status]}
                  alt={status}
                  className="w-full h-auto"
                />
                <CurrentTime />
                {/* 根据当前状态渲染对应的覆盖按钮区域 */}
                <ImageOverlay
                  currentStatus={status}
                  onButtonClick={handleButtonClick}
                />
              </div>
            </div>
            {/* 显示工作记录统计 */}
            <WorkCalendar status={status} />
          </div>
        )}
        <Footer />
      </div>
    </div>
  );
}

export default App;
