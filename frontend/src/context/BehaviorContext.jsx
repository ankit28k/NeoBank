import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { BehaviorSDK } from "../sdk/BehaviorSDK.js";

const BehaviorContext = createContext({ trustScore: null });

export function useBehavior() {
  return useContext(BehaviorContext);
}

export function BehaviorProvider({ children }) {
  const sdkRef              = useRef(null);
  const [trustScore, setTrustScore] = useState(null);

  useEffect(() => {
    const token   = localStorage.getItem("nb_token");
    const userStr = localStorage.getItem("nb_user");
    if (!token || !userStr) return;

    const user = JSON.parse(userStr);
    const sdk  = new BehaviorSDK(user._id, setTrustScore);
    sdk.start();
    sdkRef.current = sdk;

    return () => { sdk.stop(); };
  }, []);

  return (
    <BehaviorContext.Provider value={{ trustScore }}>
      {children}
    </BehaviorContext.Provider>
  );
}
