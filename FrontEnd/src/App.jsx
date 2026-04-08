import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Hero          from './pages/Hero';
import Prediccion    from './pages/Prediccion';
import Datos         from './pages/Datos';
import Entrenamiento from './pages/Entrenamiento';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"              element={<Hero />} />
        <Route path="/prediccion"    element={<Prediccion />} />
        <Route path="/datos"         element={<Datos />} />
        <Route path="/entrenamiento" element={<Entrenamiento />} />
      </Routes>
    </BrowserRouter>
  );
}