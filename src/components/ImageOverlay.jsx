import React, { useState } from "react";

const baseWidth = 1380;
const baseHeight = 780;

// 按钮区域坐标（上左、上右、下右、下左）
const buttonPolygons = {
  shukkin: {
    points: [
      { x: 438, y: 256 },
      { x: 776, y: 195 },
      { x: 823, y: 418 },
      { x: 488, y: 494 },
    ],
  },
  taikin: {
    points: [
      { x: 859, y: 181 },
      { x: 1146, y: 131 },
      { x: 1191, y: 335 },
      { x: 905, y: 400 },
    ],
  },
  kyuukeikaishi: {
    points: [
      { x: 494, y: 528 },
      { x: 829, y: 450 },
      { x: 849, y: 540 },
      { x: 515, y: 623 },
    ],
  },
  kyuukeishuuryou: {
    points: [
      { x: 912, y: 432 },
      { x: 1198, y: 367 },
      { x: 1215, y: 447 },
      { x: 932, y: 520 },
    ],
  },
};

// 将点坐标转换为字符串格式（"x,y" 格式），多个点之间用空格分隔
function convertPointsToString(points) {
  return points.map((pt) => `${pt.x},${pt.y}`).join(" ");
}

function ImageOverlay({ currentStatus, onButtonClick }) {
  const [hoveredButton, setHoveredButton] = useState(null);

  // 根据当前状态确定哪些按钮可用：
  // - 出勤：仅当当前状态为 "taikin" 时可用
  // - 退勤：当状态为 "shukkin" 或 "kyuukeishuuryou" 时可用
  // - 休息开始：当状态为 "shukkin" 时可用
  // - 休息结束：当状态为 "kyuukeikaishi" 时可用
  const enabledButtons = {
    shukkin: currentStatus === "taikin",
    taikin: currentStatus === "shukkin" || currentStatus === "kyuukeishuuryou",
    kyuukeikaishi: currentStatus === "shukkin",
    kyuukeishuuryou: currentStatus === "kyuukeikaishi",
  };

  return (
    <svg
      viewBox={`0 0 ${baseWidth} ${baseHeight}`}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
      }}
    >
      {Object.keys(buttonPolygons).map((key) => {
        const polygon = buttonPolygons[key];
        const pointsStr = convertPointsToString(polygon.points);
        const isEnabled = enabledButtons[key];
        return (
          <polygon
            key={key}
            points={pointsStr}
            fill="rgba(0, 0, 0, 0)" // 透明填充
            stroke={
              hoveredButton === key && isEnabled
                ? key === currentStatus
                  ? "#bfb3cc"
                  : "#6c40ab"
                : "rgba(0, 0, 0, 0)"
            }
            strokeWidth="1"
            style={{ cursor: isEnabled ? "pointer" : "default" }}
            onMouseEnter={() => setHoveredButton(key)}
            onMouseLeave={() => setHoveredButton(null)}
            onClick={() => {
              if (isEnabled) {
                onButtonClick(key);
              }
            }}
          />
        );
      })}
    </svg>
  );
}

export default ImageOverlay;
