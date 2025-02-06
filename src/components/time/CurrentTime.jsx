// CurrentTime.jsx
import { useEffect, useState } from "react";
import "./CurrentTime.css";

function CurrentTime() {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().toLocaleTimeString());
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
