import React from 'react';
import { useNavigate } from 'react-router-dom';

function CharacterLoot() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Character Loot</h1>
      <button onClick={() => navigate('/')}>Back to Characters</button>
      {/* Add your character loot content here */}
    </div>
  );
}

export default CharacterLoot; 