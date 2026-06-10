import { createContext, useContext, useEffect, useRef, useState } from "react";
import { BehaviorSDK } from "../sdk/BehaviorSDK.js";

const BehaviorContext = createContext({ trustScore: null, isNewUser: false });

export function useBehavior() {
  return useContext(BehaviorContext);
}

export function BehaviorProvider({ children }) {
  const sdkRef = useRef(null);
  const [trustScore, setTrustScore] = useState(null);
  const [isNewUser,  setIsNewUser]  = useState(false);

  useEffect(() => {
    const token   = localStorage.getItem("nb_token");
    const userStr = localStorage.getItem("nb_user");
    if (!token || !userStr) return;

    // Check if new user — no model trained yet
    fetch("/api/behavior/status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { if (data.isNewUser) setIsNewUser(true); })
      .catch(() => {});

    const user = JSON.parse(userStr);
    const sdk  = new BehaviorSDK(user._id, (score) => {
      if (score.model_trained === false) return; // don't update badge until trained
      setIsNewUser(false); // model now exists, clear new user state
      setTrustScore(score);
    });

    sdk.start();
    sdkRef.current = sdk;

    return () => { sdk.stop(); };
  }, []);

  return (
    <BehaviorContext.Provider value={{ trustScore, isNewUser }}>
      {children}
    </BehaviorContext.Provider>
  );
}