import CharacterSheet from './pages/CharacterSheet';
import CharacterLoot from './pages/CharacterLoot';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/character-sheet" element={<CharacterSheet />} />
        <Route path="/character-loot" element={<CharacterLoot />} />
      </Routes>
    </Router>
  );
} 