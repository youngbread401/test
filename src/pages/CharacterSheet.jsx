import React from 'react';
import { useNavigate } from 'react-router-dom';

function CharacterSheet() {
  const navigate = useNavigate();

  return (
    <div>
      <h1>Character Sheet</h1>
      <button onClick={() => navigate('/')}>Back to Characters</button>
      {/* Add your character sheet content here */}
    </div>
  );
}

export default CharacterSheet; 