import { Navigate } from "react-router-dom";

// This page is deprecated in favor of role-based routing in App.tsx
export default function Index() {
  return <Navigate to="/" replace />;
}