export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("attendanceDB", 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("events")) {
        const store = db.createObjectStore("events", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
    request.onsuccess = (event) => {
      resolve(event.target.result);
    };
    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

export function addEvent(eventData) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction("events", "readwrite");
        const store = tx.objectStore("events");
        const request = store.add(eventData);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
      })
  );
}

export function getAllEvents() {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction("events", "readonly");
        const store = tx.objectStore("events");
        const request = store.getAll();
        request.onsuccess = (e) => {
          const events = e.target.result;
          events.sort((a, b) => a.timestamp - b.timestamp);
          resolve(events);
        };
        request.onerror = (e) => reject(e);
      })
  );
}

/**
 * 删除单条事件记录（根据事件的 id 删除）
 */
export function deleteEvent(id) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction("events", "readwrite");
        const store = tx.objectStore("events");
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e);
      })
  );
}
