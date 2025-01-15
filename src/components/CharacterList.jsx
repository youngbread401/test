function CharacterList() {
  // ... existing imports and code ...

  return (
    <div>
      {/* ... existing code ... */}
      <div className="button-container">
        <button onClick={() => navigate('/new-character')}>New Character</button>
        <button onClick={() => navigate('/party-loot')}>Party Loot</button>
        <button onClick={() => navigate('/character-sheet')}>Character Sheet</button>
        <button onClick={() => navigate('/character-loot')}>Character Loot</button>
      </div>
      {/* ... character list ... */}
    </div>
  );
} 