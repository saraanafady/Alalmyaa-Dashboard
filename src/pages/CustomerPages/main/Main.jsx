import React from "react";
import { useAuth } from "../../../contexts/AuthContext";
export default function Main() {
  const { logout } = useAuth();
  return (
    <div>
      <h1>Hello User</h1>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
