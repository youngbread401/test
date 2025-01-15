import React, { useState } from 'react';

function CharacterCard({ character, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const handleDelete = () => {
    if (deleteInput === character.name) {
      onDelete(character.id);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="character-card">
      {/* ... existing character info ... */}
      
      <button onClick={() => setShowDeleteConfirm(true)} className="delete-button">
        Delete Character
      </button>

      {showDeleteConfirm && (
        <div className="delete-confirm">
          <p>Type "{character.name}" to confirm deletion:</p>
          <input
            type="text"
            value={deleteInput}
            onChange={(e) => setDeleteInput(e.target.value)}
          />
          <button onClick={handleDelete}>Confirm Delete</button>
          <button onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default CharacterCard; 