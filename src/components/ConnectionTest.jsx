import React, { useEffect, useState } from "react";
import { pingServer } from "../services/api";

const ConnectionTest = () => {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const data = await pingServer();
        setMessage(data.message);
      } catch (err) {
        setMessage("Failed to connect to the server");
      }
    };

    checkConnection();
  }, []);

  return (
    <div>
      <h1>Server Connection Status</h1>
      <p>{message}</p>
    </div>
  );
};

export default ConnectionTest;
