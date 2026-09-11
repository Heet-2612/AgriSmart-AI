import { Header } from './components/Header';
import { DiagnosePage } from './pages/DiagnosePage';

function Footer() {
  return (
    <footer
      className="border-t py-6 text-center text-xs"
      style={{ borderColor: '#E2E8F0', color: '#94A3B8', backgroundColor: '#F8FAFC' }}
      role="contentinfo"
    >
      © {new Date().getFullYear()} AgriSmart AI — Smart India Hackathon 2026
    </footer>
  );
}

export default function App() {
  return (
    <div id="app-shell" className="flex min-h-screen flex-col">
      <Header />
      <DiagnosePage />
      <Footer />
    </div>
  );
}
