import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Generate from "./pages/Generate";
import History from "./pages/History";

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Generate />} />
        <Route path="/history" element={<History />} />
      </Routes>
    </BrowserRouter>
  );
}
