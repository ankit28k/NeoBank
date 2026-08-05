import { createContext, useContext, useEffect, useState, useCallback } from "react";
import client from "../api/client.js";

const BehaviorContext = createContext({
  modelTrained: false,
  isNewUser: false,
  samplesCollected: 0,
  refreshStatus: () => {},
});

export function useBehavior() {
  return useContext(BehaviorContext);
}

export function BehaviorProvider({ children }) {
  const [status, setStatus] = useState({
    modelTrained: false,
    isNewUser: false,
    samplesCollected: 0,
  });

  const refreshStatus = useCallback(() => {
    client.get("/behavior/status")
      .then(r => setStatus(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  return (
    <BehaviorContext.Provider value={{ ...status, refreshStatus }}>
      {children}
    </BehaviorContext.Provider>
  );
}