import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { seedIfEmpty } from "@/lib/seed";

const Index = () => {
  useEffect(() => { seedIfEmpty(); }, []);
  return <Navigate to="/" replace />;
};

export default Index;
