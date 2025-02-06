// 生成 2024 年出勤日志虚拟数据的脚本

function generateAttendanceLogs() {
  const events = [];
  const startYear = 2024;

  // 从 2024-01-01 开始
  let currentDate = new Date(`${startYear}-01-01T00:00:00`);

  // 由于 2024 年有 366 天，所以循环直到年份不再是 2024
  while (currentDate.getFullYear() === startYear) {
    // 随机决定当天是否为夜班（例如 20% 的概率为夜班）
    const isNightShift = Math.random() < 0.2;

    // 根据当前日期生成一个班次的“出勤”时间
    let shiftStart = new Date(currentDate);
    if (isNightShift) {
      // 夜班：随机设定出勤时间在当日 21:00 ~ 23:00 之间
      const hour = 21 + Math.floor(Math.random() * 3); // 可能为 21, 22, 或 23 点
      const minute = Math.floor(Math.random() * 60);
      shiftStart.setHours(hour, minute, 0, 0);
    } else {
      // 日班：随机设定出勤时间在当日 6:00 ~ 10:00 之间
      const hour = 6 + Math.floor(Math.random() * 5); // 可能为 6 ~ 10 点
      const minute = Math.floor(Math.random() * 60);
      shiftStart.setHours(hour, minute, 0, 0);
    }

    // 添加出勤事件
    events.push({ type: "shukkin", timestamp: shiftStart.getTime() });

    // 决定是否在该班次中休息（50% 可能性）
    const takeBreak = Math.random() < 0.5;
    let breakStart = null;
    let breakEnd = null;
    let workDuration; // 实际工作（非休息）时长（毫秒）
    let breakDuration = 0; // 休息时长（毫秒）

    if (takeBreak) {
      // 如果休息，假定工作时长在 7～8 小时之间（不含休息）
      workDuration = (7 + Math.random()) * 60 * 60 * 1000;
      // 休息时长在 30～60 分钟之间
      breakDuration = (0.5 + Math.random() * 0.5) * 60 * 60 * 1000;

      // 休息开始时间：距离出勤后 2 小时以上
      // 日班：随机在 2～4 小时后开始；夜班：为了不太晚，随机在 2～3 小时后开始
      const breakOffsetHours = isNightShift
        ? 2 + Math.random()
        : 2 + Math.random() * 2;
      const breakOffset = breakOffsetHours * 60 * 60 * 1000;
      breakStart = new Date(shiftStart.getTime() + breakOffset);
      breakEnd = new Date(breakStart.getTime() + breakDuration);

      // 添加休息开始和休息结束事件
      events.push({ type: "kyuukeikaishi", timestamp: breakStart.getTime() });
      events.push({ type: "kyuukeishuuryou", timestamp: breakEnd.getTime() });
    } else {
      // 如果不休息，假定班次总时长在 8～10 小时之间
      workDuration = (8 + Math.random() * 2) * 60 * 60 * 1000;
    }

    // 班次结束（退勤）的时间 = 出勤时间 + 工作时长 + （休息时长，如果有的话）
    const shiftEndTime = new Date(
      shiftStart.getTime() + workDuration + breakDuration
    );
    events.push({ type: "taikin", timestamp: shiftEndTime.getTime() });

    // 前进到下一天
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // 虽然生成顺序已经是递增的，但我们仍做一次排序以防万一
  events.sort((a, b) => a.timestamp - b.timestamp);
  return events;
}

export default generateAttendanceLogs;
