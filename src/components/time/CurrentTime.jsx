// CurrentTime.jsx
import { useEffect, useState } from "react";
import { timestampToTime } from "../../utils/time";
import "./CurrentTime.css";

function CurrentTime() {
  const [time, setTime] = useState(timestampToTime(new Date().getTime()));
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(timestampToTime(new Date().getTime()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="current-time hind-mysuru-regular">
      {time}
    </div>
  );
}

export default CurrentTime;
