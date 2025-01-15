import React, { useState, useCallback, useEffect, useRef, memo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  TouchableOpacity, 
  Pressable,
  TextInput, 
  ScrollView, 
  Alert, 
  Modal,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Keyboard,
  Vibration,
  Dimensions
} from 'react-native';
import { initializeApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  onValue, 
  set, 
  get, 
  off 
} from 'firebase/database';
import { debounce } from 'lodash';
import { ScrollView as GestureScrollView } from 'react-native-gesture-handler';
import { DiceRoller } from './components/DiceModel';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBSy8ia6vKnq95_gbO7lnohVbyAQzqBtk4",
  authDomain: "dndcombattracker-572b0.firebaseapp.com",
  databaseURL: "https://dndcombattracker-572b0-default-rtdb.firebaseio.com",
  projectId: "dndcombattracker-572b0",
  storageBucket: "dndcombattracker-572b0.firebasestorage.app",
  messagingSenderId: "812186225431",
  appId: "1:812186225431:web:8da48e238d10db01d14552"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Constants
const LETTERS = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ffffff'];
const GRID_SIZE = 10;
const ABILITY_SCORES = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const SKILLS = {
  STR: ['Athletics'],
  DEX: ['Acrobatics', 'Sleight of Hand', 'Stealth'],
  CON: [],
  INT: ['Arcana', 'History', 'Investigation', 'Nature', 'Religion'],
  WIS: ['Animal Handling', 'Insight', 'Medicine', 'Perception', 'Survival'],
  CHA: ['Deception', 'Intimidation', 'Performance', 'Persuasion']
};
const CURRENCY = ['CP', 'SP', 'EP', 'GP', 'PP'];
const DICE_TYPES = [
  { sides: 4, color: '#FF6B6B' },
  { sides: 6, color: '#4ECDC4' },
  { sides: 8, color: '#45B7D1' },
  { sides: 10, color: '#96CEB4' },
  { sides: 12, color: '#FFEEAD' },
  { sides: 20, color: '#D4A5A5' },
  { sides: 100, color: '#9B59B6' }
];
const STATUS_EFFECTS = [
  { id: 'blinded', name: 'Blinded', icon: '👁️' },
  { id: 'charmed', name: 'Charmed', icon: '💕' },
  { id: 'deafened', name: 'Deafened', icon: '👂' },
  { id: 'frightened', name: 'Frightened', icon: '😨' },
  { id: 'grappled', name: 'Grappled', icon: '🤼' },
  { id: 'incapacitated', name: 'Incapacitated', icon: '💫' },
  { id: 'invisible', name: 'Invisible', icon: '👻' },
  { id: 'paralyzed', name: 'Paralyzed', icon: '⚡' },
  { id: 'petrified', name: 'Petrified', icon: '🗿' },
  { id: 'poisoned', name: 'Poisoned', icon: '🤢' },
  { id: 'prone', name: 'Prone', icon: '⬇️' },
  { id: 'restrained', name: 'Restrained', icon: '⛓️' },
  { id: 'stunned', name: 'Stunned', icon: '💫' },
  { id: 'unconscious', name: 'Unconscious', icon: '💤' }
];

// Add this constant near the other constants at the top
const COMMON_ENEMIES = [
  {
    name: 'Bandit',
    hp: 11,
    maxHp: 11,
    ac: 12,
    initiativeBonus: 1,
    color: '#8B4513'
  },
  {
    name: 'Wolf',
    hp: 11,
    maxHp: 11,
    ac: 13,
    initiativeBonus: 2,
    color: '#808080'
  },
  {
    name: 'Wraith',
    hp: 67,
    maxHp: 67,
    ac: 13,
    initiativeBonus: 2,
    color: '#4A0404'
  },
  {
    name: 'Goblin',
    hp: 7,
    maxHp: 7,
    ac: 15,
    initiativeBonus: 2,
    color: '#355E3B'
  },
  {
    name: 'Skeleton',
    hp: 13,
    maxHp: 13,
    ac: 13,
    initiativeBonus: 2,
    color: '#E1D9D1'
  },
  {
    name: 'Zombie',
    hp: 22,
    maxHp: 22,
    ac: 8,
    initiativeBonus: -2,
    color: '#4A412A'
  }
];

// Get window dimensions
const windowDimensions = Dimensions.get('window');
const isSmallScreen = windowDimensions.width < 768;

// Theme configuration
const THEME = {
  primary: '#1E1E1E',
  secondary: '#2D2D2D',
  accent: '#7289DA',
  gold: '#FFD700',
  danger: '#ED4245',
  success: '#3BA55C',
  text: {
    light: '#FFFFFF',
    dark: '#1E1E1E'
  },
  background: {
    primary: '#1E1E1E',
    secondary: '#2D2D2D',
    dark: '#141414',
    panel: '#363636'
  }
};

// Initial game state
const initialGameState = {
  tokens: {},
  layers: {
    grid: true,
    terrain: {},
    tokens: {},
    effects: {},
    fog: {}
  },
  initiative: [],
  inCombat: false,
  currentTurn: 0,
  settings: {
    gridSize: GRID_SIZE,
    showCoordinates: true,
  },
  partyLoot: {
    currency: { CP: 0, SP: 0, EP: 0, GP: 0, PP: 0 },
    items: [],
    currentViewer: null
  },
  characters: [],
  lastUpdate: Date.now()
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background.primary,
    height: '100%',
    width: '100%',
  },
  header: {
    padding: isSmallScreen ? 10 : 20,
    backgroundColor: THEME.background.panel,
    width: '100%',
  },
  title: {
    fontSize: isSmallScreen ? 18 : 24,
    fontWeight: 'bold',
    color: THEME.text.light,
    marginBottom: 10,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: isSmallScreen ? 'center' : 'flex-start',
  },
  controlButton: {
    padding: isSmallScreen ? 8 : 10,
    borderRadius: 5,
    minWidth: isSmallScreen ? 80 : 100,
    alignItems: 'center',
  },
  content: {
    flex: 1,
    width: '100%',
  },
  mainArea: {
    flex: 1,
    flexDirection: isSmallScreen ? 'column' : 'row',
    padding: isSmallScreen ? 10 : 20,
    gap: 20,
    minHeight: '100%',
  },
  gridSection: {
    flex: 1,
    minHeight: isSmallScreen ? 400 : '100%',
  },
  sidebar: {
    width: isSmallScreen ? '100%' : 350,
    flexShrink: 0,
  },
  gridContainer: {
    padding: isSmallScreen ? 5 : 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    width: isSmallScreen ? 35 : 60,
    height: isSmallScreen ? 35 : 60,
    borderWidth: 1,
    borderColor: THEME.accent,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background.secondary,
  },
  tokenContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    padding: isSmallScreen ? 1 : 2,
  },
  tokenText: {
    fontSize: isSmallScreen ? 10 : 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tokenHp: {
    fontSize: isSmallScreen ? 8 : 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: THEME.background.panel,
    padding: 20,
    borderRadius: 10,
    width: isSmallScreen ? '90%' : 400,
  },
  modalTitle: {
    fontSize: isSmallScreen ? 18 : 20,
    fontWeight: 'bold',
    color: THEME.text.light,
    marginBottom: 15,
  },
  input: {
    borderWidth: 1,
    borderColor: THEME.accent,
    borderRadius: 5,
    padding: 10,
    marginBottom: 10,
    color: THEME.text.light,
    backgroundColor: THEME.background.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  modalButton: {
    padding: 10,
    borderRadius: 5,
    minWidth: 100,
    alignItems: 'center',
  },
  buttonText: {
    color: THEME.text.light,
    fontWeight: 'bold',
    fontSize: isSmallScreen ? 12 : 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: THEME.background.primary,
    width: '100%',
    height: '100%',
  },
  loadingText: {
    color: THEME.text.light,
    fontSize: 16,
    marginTop: 10,
  },
  loadingButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  diceBox: {
    width: '100%',
    backgroundColor: THEME.background.panel,
    borderRadius: 10,
    padding: isSmallScreen ? 8 : 15,
  },
  diceControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  diceButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'center',
  },
  diceButton: {
    padding: isSmallScreen ? 5 : 10,
    backgroundColor: THEME.primary,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: isSmallScreen ? 30 : 60,
  },
  diceHistory: {
    maxHeight: isSmallScreen ? 100 : 200,
    marginTop: 10,
  },
  diceResultContainer: {
    padding: 5,
    borderBottomWidth: 1,
    borderBottomColor: THEME.accent + '40',
  },
  diceResult: {
    color: THEME.text.light,
  },
  diceTotal: {
    fontWeight: 'bold',
    color: THEME.accent,
  },
  diceRolls: {
    color: THEME.text.light + '80',
    fontSize: 12,
  },
  initiativeList: {
    backgroundColor: THEME.background.panel,
    borderRadius: 10,
    padding: isSmallScreen ? 8 : 15,
    width: '100%',
  },
  initiativeScroll: {
    maxHeight: isSmallScreen ? 150 : 200,
  },
  initiativeItem: {
    padding: 10,
    borderRadius: 5,
    marginBottom: 5,
    backgroundColor: THEME.background.primary,
  },
  currentInitiative: {
    backgroundColor: THEME.accent,
  },
  initiativeText: {
    color: THEME.text.light,
  },
  currentInitiativeText: {
    color: THEME.text.dark,
    fontWeight: 'bold',
  },
  zoomControls: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    gap: 10,
    display: isSmallScreen ? 'flex' : 'none',
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: THEME.background.panel,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.8,
  },
  advantageButton: {
    backgroundColor: THEME.background.primary,
    padding: 8,
    borderRadius: 5,
  },
  advantageActive: {
    backgroundColor: THEME.accent,
  },
  modifierInput: {
    backgroundColor: THEME.background.primary,
    color: THEME.text.light,
    padding: 8,
    borderRadius: 5,
    width: 60,
    textAlign: 'center',
  },
  boxTitle: {
    color: THEME.text.light,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  colorPicker: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: isSmallScreen ? 2 : 5,
    marginBottom: isSmallScreen ? 5 : 10,
  },
  colorButton: {
    width: isSmallScreen ? 20 : 30,
    height: isSmallScreen ? 20 : 30,
    borderRadius: isSmallScreen ? 10 : 15,
    margin: isSmallScreen ? 1 : 2,
  },
  selectedColor: {
    borderWidth: 2,
    borderColor: THEME.accent,
  },
});

const additionalStyles = StyleSheet.create({
  characterSheet: {
    backgroundColor: THEME.background.panel,
    padding: 20,
    borderRadius: 10,
    width: isSmallScreen ? '95%' : '80%',
    maxWidth: 800,
    maxHeight: '90%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text.light,
    marginBottom: 10,
  },
  abilityScores: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 10,
  },
  abilityBox: {
    backgroundColor: THEME.background.primary,
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    width: isSmallScreen ? '30%' : 100,
    marginBottom: 10,
  },
  abilityLabel: {
    color: THEME.text.light,
    fontWeight: 'bold',
  },
  abilityScore: {
    color: THEME.accent,
    fontSize: 24,
    fontWeight: 'bold',
    width: '100%',
    textAlign: 'center',
    padding: 5,
  },
  abilityMod: {
    color: THEME.text.light,
  },
  skillsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  skillItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.background.primary,
    padding: 8,
    borderRadius: 5,
    minWidth: isSmallScreen ? '45%' : 200,
  },
  proficientDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  skillName: {
    color: THEME.text.light,
    flex: 1,
  },
  skillMod: {
    color: THEME.accent,
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 10,
  },
  closeButtonText: {
    color: THEME.text.light,
    fontSize: 20,
  },
  lootSection: {
    backgroundColor: THEME.background.primary,
    padding: 15,
    borderRadius: 5,
    marginBottom: 15,
  },
  currencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  currencyInput: {
    backgroundColor: THEME.background.secondary,
    color: THEME.text.light,
    padding: 8,
    borderRadius: 5,
    width: 80,
    textAlign: 'center',
  },
  currencyLabel: {
    color: THEME.text.light,
    width: 30,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  itemInput: {
    flex: 1,
    backgroundColor: THEME.background.secondary,
    color: THEME.text.light,
    padding: 8,
    borderRadius: 5,
  },
  removeButton: {
    padding: 5,
    borderRadius: 5,
    backgroundColor: THEME.danger,
  },
  addButton: {
    backgroundColor: THEME.success,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  lootHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  addedBy: {
    color: THEME.text.light,
    opacity: 0.6,
    fontSize: 12,
    marginTop: 4,
  },
  enemyOption: {
    padding: 15,
    borderRadius: 5,
    marginBottom: 8,
    backgroundColor: THEME.background.secondary,
  },
  dmToggle: {
    backgroundColor: THEME.background.secondary,
    padding: 10,
    borderRadius: 5,
    marginLeft: 10,
  },
  dmToggleActive: {
    backgroundColor: THEME.accent,
  }
});

const diceStyles = StyleSheet.create({
  dicePanel: {
    backgroundColor: THEME.background.panel,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  diceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  diceTitle: {
    color: THEME.text.light,
    fontSize: 18,
    fontWeight: 'bold',
  },
  diceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 15,
  },
  diceButton: {
    width: isSmallScreen ? 45 : 60,
    height: isSmallScreen ? 45 : 60,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)', // Replace elevation and shadowProps
  },
  diceButtonText: {
    color: THEME.text.light,
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: 'bold',
  },
  diceControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.background.primary,
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  controlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlButton: {
    backgroundColor: THEME.background.secondary,
    padding: 8,
    borderRadius: 5,
    minWidth: 80,
    alignItems: 'center',
  },
  controlActive: {
    backgroundColor: THEME.accent,
  },
  modifierGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  modifierLabel: {
    color: THEME.text.light,
    fontSize: 14,
  },
  modifierInput: {
    backgroundColor: THEME.background.secondary,
    color: THEME.text.light,
    padding: 8,
    borderRadius: 5,
    width: 50,
    textAlign: 'center',
  },
  historyContainer: {
    backgroundColor: THEME.background.primary,
    borderRadius: 8,
    maxHeight: 200,
  },
  historyScroll: {
    padding: 10,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.background.secondary,
  },
  historyLeft: {
    flex: 1,
  },
  historyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  historyDice: {
    color: THEME.text.light,
    opacity: 0.7,
  },
  historyRolls: {
    color: THEME.text.light,
    fontSize: 12,
    opacity: 0.5,
  },
  historyTotal: {
    color: THEME.accent,
    fontSize: 18,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: THEME.background.secondary,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginTop: 10,
  },
  quantityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  quantityLabel: {
    color: THEME.text.light,
    fontSize: 14,
  },
  quantityInput: {
    backgroundColor: THEME.background.secondary,
    color: THEME.text.light,
    padding: 8,
    borderRadius: 5,
    width: 50,
    textAlign: 'center',
  },
  diceControls: {
    flexDirection: 'column',
    backgroundColor: THEME.background.primary,
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    gap: 10,
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diceContainer: {
    width: isSmallScreen ? 80 : 100,
    height: isSmallScreen ? 80 : 100,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 5,
  }
});

const statusStyles = StyleSheet.create({
  effectsContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: THEME.accent + '40',
    paddingTop: 15,
  },
  effectsTitle: {
    color: THEME.text.light,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  effectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  effectButton: {
    backgroundColor: THEME.background.primary,
    padding: 8,
    borderRadius: 5,
    alignItems: 'center',
    minWidth: 80,
  },
  effectActive: {
    backgroundColor: THEME.accent,
  },
  effectText: {
    color: THEME.text.light,
    fontSize: 12,
  },
  tokenEffects: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    marginTop: 2,
  },
  effectIcon: {
    fontSize: isSmallScreen ? 10 : 12,
  },
});

// Create a helper function to save game state
const saveGameState = async () => {
  if (firebaseRef.current) {
    try {
      await set(firebaseRef.current, {
        tokens,
        layers,
        initiative,
        inCombat,
        currentTurn,
        partyLoot,
        characters,
        settings: initialGameState.settings,
        lastUpdate: Date.now()
      });
    } catch (error) {
      console.error('Error saving game state:', error);
      Alert.alert('Error', 'Failed to save game state');
    }
  }
};

// Add this component definition before the TokenModal component
const CharacterSheetModal = memo(({ visible, onClose, character, characters, onUpdate }) => {
  const [editedCharacter, setEditedCharacter] = useState(() => ({
    name: character?.name || '',
    class: character?.class || '',
    level: character?.level || 1,
    owner: character?.owner || '',
    proficiencyBonus: character?.proficiencyBonus || 2,
    // Add HP and AC
    hp: character?.hp || 0,
    maxHp: character?.maxHp || 0,
    ac: character?.ac || 10,
    abilityScores: character?.abilityScores || {
      STR: 10,
      DEX: 10,
      CON: 10,
      INT: 10,
      WIS: 10,
      CHA: 10
    },
    proficientSkills: character?.proficientSkills || [],
    currency: character?.currency || {
      CP: 0,
      SP: 0,
      EP: 0,
      GP: 0,
      PP: 0
    },
    items: character?.items || [],
    inventory: character?.inventory || []
  }));

  useEffect(() => {
    if (visible && character) {
      setEditedCharacter({
        name: character.name || '',
        class: character.class || '',
        level: character.level || 1,
        owner: character.owner || '',
        proficiencyBonus: character.proficiencyBonus || 2,
        hp: character.hp || 0,
        maxHp: character.maxHp || 0,
        ac: character.ac || 10,
        abilityScores: character.abilityScores || {
          STR: 10,
          DEX: 10,
          CON: 10,
          INT: 10,
          WIS: 10,
          CHA: 10
        },
        proficientSkills: character.proficientSkills || [],
        currency: character.currency || {
          CP: 0,
          SP: 0,
          EP: 0,
          GP: 0,
          PP: 0
        },
        items: character.items || [],
        inventory: character.inventory || []
      });
    }
  }, [visible, character]);

  // Add error boundary
  if (!character) {
    console.error('No character data provided to CharacterSheetModal');
    return null;
  }

  const calculateModifier = (score) => {
    return Math.floor((score - 10) / 2);
  };

  const handleAbilityScoreChange = (ability, value) => {
    const newScore = parseInt(value) || 0;
    setEditedCharacter(prev => ({
      ...prev,
      abilityScores: {
        ...prev.abilityScores,
        [ability]: newScore
      }
    }));
  };

  const toggleProficiency = (skill) => {
    setEditedCharacter(prev => ({
      ...prev,
      proficientSkills: prev.proficientSkills.includes(skill)
        ? prev.proficientSkills.filter(s => s !== skill)
        : [...prev.proficientSkills, skill]
    }));
  };

  const getSkillModifier = (skill, ability) => {
    const abilityMod = calculateModifier(editedCharacter.abilityScores[ability]);
    const profBonus = editedCharacter.proficientSkills.includes(skill) ? editedCharacter.proficiencyBonus : 0;
    return abilityMod + profBonus;
  };

  const handleSave = async () => {
    try {
      const updatedCharacter = {
        ...character,
        ...editedCharacter
      };

      onUpdate(updatedCharacter);
    } catch (error) {
      console.error('Error saving character:', error);
      Alert.alert('Error', 'Failed to save character');
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={additionalStyles.characterSheet}>
          <TouchableOpacity 
            style={additionalStyles.closeButton}
            onPress={onClose}
          >
            <Text style={additionalStyles.closeButtonText}>×</Text>
          </TouchableOpacity>

          <GestureScrollView>
            {/* Basic Info */}
            <View style={additionalStyles.sheetSection}>
              <Text style={additionalStyles.sectionTitle}>Character Info</Text>
              <TextInput
                style={styles.input}
                value={editedCharacter.name}
                onChangeText={(text) => setEditedCharacter(prev => ({...prev, name: text}))}
                placeholder="Character Name"
                placeholderTextColor={THEME.text.light + '80'}
              />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={editedCharacter.class}
                  onChangeText={(text) => setEditedCharacter(prev => ({...prev, class: text}))}
                  placeholder="Class"
                  placeholderTextColor={THEME.text.light + '80'}
                />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={String(editedCharacter.level)}
                  onChangeText={(text) => setEditedCharacter(prev => ({...prev, level: parseInt(text) || 1}))}
                  placeholder="Level"
                  keyboardType="numeric"
                  placeholderTextColor={THEME.text.light + '80'}
                />
              </View>

              {/* Add HP and AC fields here */}
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.buttonText, { marginBottom: 5 }]}>Hit Points</Text>
                  <View style={{ flexDirection: 'row', gap: 5 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={String(editedCharacter.hp)}
                      onChangeText={(text) => setEditedCharacter(prev => ({
                        ...prev,
                        hp: parseInt(text) || 0
                      }))}
                      placeholder="Current HP"
                      keyboardType="numeric"
                      placeholderTextColor={THEME.text.light + '80'}
                    />
                    <Text style={{ color: THEME.text.light, alignSelf: 'center', fontSize: 18 }}>/</Text>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={String(editedCharacter.maxHp)}
                      onChangeText={(text) => setEditedCharacter(prev => ({
                        ...prev,
                        maxHp: parseInt(text) || 0
                      }))}
                      placeholder="Max HP"
                      keyboardType="numeric"
                      placeholderTextColor={THEME.text.light + '80'}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.buttonText, { marginBottom: 5 }]}>Armor Class</Text>
                  <TextInput
                    style={styles.input}
                    value={String(editedCharacter.ac)}
                    onChangeText={(text) => setEditedCharacter(prev => ({
                      ...prev,
                      ac: parseInt(text) || 10
                    }))}
                    placeholder="AC"
                    keyboardType="numeric"
                    placeholderTextColor={THEME.text.light + '80'}
                  />
                </View>
              </View>
            </View>

            {/* Ability Scores */}
            <View style={additionalStyles.sheetSection}>
              <Text style={additionalStyles.sectionTitle}>Ability Scores</Text>
              <View style={additionalStyles.abilityScores}>
                {ABILITY_SCORES.map(ability => (
                  <View key={ability} style={additionalStyles.abilityBox}>
                    <Text style={additionalStyles.abilityLabel}>{ability}</Text>
                    <TextInput
                      style={additionalStyles.abilityScore}
                      value={String(editedCharacter.abilityScores[ability])}
                      onChangeText={(text) => handleAbilityScoreChange(ability, text)}
                      keyboardType="numeric"
                      maxLength={2}
                      selectTextOnFocus={true}
                    />
                    <Text style={additionalStyles.abilityMod}>
                      {calculateModifier(editedCharacter.abilityScores[ability]) >= 0 ? '+' : ''}
                      {calculateModifier(editedCharacter.abilityScores[ability])}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Skills */}
            <View style={additionalStyles.sheetSection}>
              <Text style={additionalStyles.sectionTitle}>Skills</Text>
              <View style={additionalStyles.skillsList}>
                {Object.entries(SKILLS).map(([ability, skills]) =>
                  skills.map(skill => (
                    <TouchableOpacity
                      key={skill}
                      style={additionalStyles.skillItem}
                      onPress={() => toggleProficiency(skill)}
                    >
                      <View style={[
                        additionalStyles.proficientDot,
                        {
                          backgroundColor: editedCharacter.proficientSkills.includes(skill)
                            ? THEME.accent
                            : THEME.background.secondary
                        }
                      ]} />
                      <Text style={additionalStyles.skillName}>{skill}</Text>
                      <Text style={additionalStyles.skillMod}>
                        {getSkillModifier(skill, ability) >= 0 ? '+' : ''}
                        {getSkillModifier(skill, ability)}
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </View>

            {/* Inventory */}
            <View style={additionalStyles.sheetSection}>
              <Text style={additionalStyles.sectionTitle}>Inventory</Text>

              <View style={additionalStyles.lootSection}>
                {/* Currency */}
                {CURRENCY.map(currency => (
                  <View key={currency} style={additionalStyles.currencyRow}>
                    <Text style={additionalStyles.currencyLabel}>{currency}</Text>
                    <TextInput
                      style={additionalStyles.currencyInput}
                      value={String(editedCharacter.currency[currency] || 0)}
                      onChangeText={(text) => {
                        const value = parseInt(text) || 0;
                        setEditedCharacter(prev => ({
                          ...prev,
                          currency: {
                            ...prev.currency,
                            [currency]: value
                          }
                        }));
                      }}
                      keyboardType="numeric"
                      placeholderTextColor={THEME.text.light + '80'}
                    />
                  </View>
                ))}
              </View>

              <View style={additionalStyles.lootSection}>
                <View style={additionalStyles.lootHeader}>
                  <Text style={additionalStyles.sectionTitle}>Items</Text>
                  <TouchableOpacity
                    style={additionalStyles.addButton}
                    onPress={() => {
                      setEditedCharacter(prev => ({
                        ...prev,
                        items: [...prev.items, { name: '', quantity: 1, notes: '', addedBy: character.name }]
                      }));
                    }}
                  >
                    <Text style={styles.buttonText}>Add Item</Text>
                  </TouchableOpacity>
                </View>

                {editedCharacter.items.map((item, index) => (
                  <View key={index} style={additionalStyles.itemRow}>
                    <View style={additionalStyles.itemInfo}>
                      <TextInput
                        style={[additionalStyles.itemInput, { flex: 2 }]}
                        value={item.name}
                        onChangeText={(text) => {
                          const newItems = [...editedCharacter.items];
                          newItems[index] = { ...item, name: text };
                          setEditedCharacter(prev => ({ ...prev, items: newItems }));
                        }}
                        placeholder="Item name"
                        placeholderTextColor={THEME.text.light + '80'}
                      />
                      <TextInput
                        style={[additionalStyles.itemInput, { width: 60 }]}
                        value={String(item.quantity)}
                        onChangeText={(text) => {
                          const newItems = [...editedCharacter.items];
                          newItems[index] = { ...item, quantity: parseInt(text) || 1 };
                          setEditedCharacter(prev => ({ ...prev, items: newItems }));
                        }}
                        keyboardType="numeric"
                        placeholder="Qty"
                        placeholderTextColor={THEME.text.light + '80'}
                      />
                      {item.addedBy === character.name && (
                        <TouchableOpacity
                          style={additionalStyles.removeButton}
                          onPress={() => {
                            setEditedCharacter(prev => ({
                              ...prev,
                              items: prev.items.filter((_, i) => i !== index)
                            }));
                          }}
                        >
                          <Text style={styles.buttonText}>×</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    <Text style={additionalStyles.addedBy}>Added by: {item.addedBy}</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: THEME.success }]}
                onPress={handleSave}
              >
                <Text style={styles.buttonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </GestureScrollView>
        </View>
      </View>
    </Modal>
  );
});

// Memoized Modal Components
const TokenModal = memo(({ 
  showTokenModal, 
  setShowTokenModal, 
  selectedToken, 
  setSelectedToken, 
  tokens, 
  firebaseRef, 
  initialGameState, 
  layers, 
  initiative, 
  inCombat, 
  currentTurn, 
  THEME 
}) => (
  <Modal
    visible={showTokenModal}
    transparent={true}
    animationType="fade"
    onRequestClose={() => setShowTokenModal(false)}
  >
    <Pressable 
      style={[styles.modalOverlay, { cursor: 'default' }]}
      onPress={() => Keyboard.dismiss()}
    >
      <View style={styles.modalContent}>
        <KeyboardAvoidingView 
          behavior={Platform.select({ ios: 'padding', android: 'height' })}
          style={styles.modalContainer}
          keyboardVerticalOffset={Platform.select({ ios: 64, android: 0 })}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Edit Token</Text>
            <TextInput
              style={styles.input}
              value={selectedToken?.name}
              onChangeText={(text) => {
                setSelectedToken(prev => ({
                  ...prev,
                  name: text
                }));
              }}
              placeholder="Token Name"
              placeholderTextColor={THEME.text.light + '80'}
              blurOnSubmit={false}
              autoComplete="off"
              spellCheck={false}
              selectTextOnFocus={true}
              enablesReturnKeyAutomatically={true}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.input}
                  value={String(selectedToken?.hp || '')}
                  onChangeText={(text) => {
                    const hp = parseInt(text) || 0;
                    setSelectedToken(prev => ({
                      ...prev,
                      hp: Math.max(0, hp)
                    }));
                  }}
                  keyboardType="numeric"
                  placeholder="Current HP"
                  placeholderTextColor={THEME.text.light + '80'}
                  blurOnSubmit={false}
                  autoComplete="off"
                  selectTextOnFocus={true}
                  enablesReturnKeyAutomatically={true}
                />
              </View>
              <View style={{ flex: 1 }}>
                <TextInput
                  style={styles.input}
                  value={String(selectedToken?.maxHp || '')}
                  onChangeText={(text) => {
                    const maxHp = parseInt(text) || 1;
                    setSelectedToken(prev => ({
                      ...prev,
                      maxHp: Math.max(1, maxHp)
                    }));
                  }}
                  keyboardType="numeric"
                  placeholder="Max HP"
                  placeholderTextColor={THEME.text.light + '80'}
                  blurOnSubmit={false}
                  autoComplete="off"
                  selectTextOnFocus={true}
                  enablesReturnKeyAutomatically={true}
                />
              </View>
            </View>

            <TextInput
              style={styles.input}
              value={String(selectedToken?.initiativeBonus || '0')}
              onChangeText={(text) => {
                setSelectedToken(prev => ({
                  ...prev,
                  initiativeBonus: parseInt(text) || 0
                }));
              }}
              keyboardType="numeric"
              placeholder="Initiative Bonus"
              placeholderTextColor={THEME.text.light + '80'}
              blurOnSubmit={false}
              autoComplete="off"
              selectTextOnFocus={true}
              enablesReturnKeyAutomatically={true}
            />

            <View style={statusStyles.effectsContainer}>
              <Text style={statusStyles.effectsTitle}>Status Effects</Text>
              <View style={statusStyles.effectsGrid}>
                {STATUS_EFFECTS.map(effect => (
                  <TouchableOpacity
                    key={effect.id}
                    style={[
                      statusStyles.effectButton,
                      selectedToken?.effects?.includes(effect.id) && statusStyles.effectActive
                    ]}
                    onPress={() => {
                      setSelectedToken(prev => {
                        const currentEffects = prev.effects || [];
                        const newEffects = currentEffects.includes(effect.id)
                          ? currentEffects.filter(e => e !== effect.id)
                          : [...currentEffects, effect.id];
                        return {
                          ...prev,
                          effects: newEffects
                        };
                      });
                    }}
                  >
                    <Text style={statusStyles.effectText}>
                      {effect.icon} {effect.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: THEME.danger }]}
                onPress={() => {
                  if (firebaseRef.current && selectedToken) {
                    const newTokens = { ...tokens };
                    delete newTokens[selectedToken.position];
                    set(firebaseRef.current, { 
                      ...initialGameState,
                      tokens: newTokens,
                      layers,
                      initiative,
                      inCombat,
                      currentTurn
                    });
                    setShowTokenModal(false);
                  }
                }}
              >
                <Text style={styles.buttonText}>Delete</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: THEME.success }]}
                onPress={() => {
                  if (firebaseRef.current && selectedToken) {
                    const newTokens = {
                      ...tokens,
                      [selectedToken.position]: selectedToken
                    };
                    set(firebaseRef.current, {
                      ...initialGameState,
                      tokens: newTokens,
                      layers,
                      initiative,
                      inCombat,
                      currentTurn
                    });
                    setShowTokenModal(false);
                  }
                }}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Pressable>
  </Modal>
));

// Update the RoomModal styles
const modalStyles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000, // Add high z-index
  },
  modalContent: {
    backgroundColor: THEME.background.panel,
    padding: 20,
    borderRadius: 10,
    width: '90%',
    maxWidth: 400,
    zIndex: 1001, // Even higher z-index
  },
});

// Update the RoomModal component
const RoomModal = memo(({ 
  showRoomModal, 
  setShowRoomModal, 
  isConnected, 
  roomCode, 
  setRoomCode, 
  isJoining, 
  connectToRoom 
}) => (
  <Modal
    visible={showRoomModal}
    transparent={true}
    animationType="fade"
    onRequestClose={() => {}}
    style={{ zIndex: 999 }} // Add z-index to Modal
  >
    <View style={[modalStyles.modalOverlay, { pointerEvents: 'auto' }]}>
      <View style={modalStyles.modalContent}>
        <Text style={styles.modalTitle}>Join Room</Text>
        <TextInput
          style={[styles.input, { marginBottom: 15, zIndex: 1002 }]} // Add z-index to input
          value={roomCode}
          onChangeText={(text) => {
            setRoomCode(text.trim().toLowerCase());
          }}
          placeholder="Enter room code..."
          placeholderTextColor={THEME.text.light + '80'}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!isJoining}
          autoFocus={true}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[
            styles.modalButton,
            { 
              backgroundColor: isJoining ? THEME.background.secondary : THEME.success,
              width: '100%',
              zIndex: 1002 // Add z-index to button
            }
          ]}
          onPress={() => {
            Keyboard.dismiss();
            connectToRoom(roomCode);
          }}
          disabled={isJoining}
        >
          {isJoining ? (
            <View style={styles.loadingButtonContent}>
              <ActivityIndicator color={THEME.text.light} />
              <Text style={[styles.buttonText, { marginLeft: 10 }]}>
                Connecting...
              </Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Join Room</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
));

const PartyLootModal = memo(({ visible, onClose, partyLoot, onUpdate, playerName }) => {
  const [editedLoot, setEditedLoot] = useState({
    currency: {
      CP: 0,
      SP: 0,
      EP: 0,
      GP: 0,
      PP: 0
    },
    items: []
  });

  useEffect(() => {
    if (visible && partyLoot) {
      setEditedLoot({
        currency: partyLoot.currency || {
          CP: 0,
          SP: 0,
          EP: 0,
          GP: 0,
          PP: 0
        },
        items: partyLoot.items || []
      });
    }
  }, [visible, partyLoot]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: '90%' }]}>
          <Text style={styles.modalTitle}>Party Loot</Text>

          <ScrollView>
            {/* Currency Section */}
            <View style={additionalStyles.lootSection}>
              {CURRENCY.map(type => (
                <View key={type} style={additionalStyles.currencyRow}>
                  <Text style={additionalStyles.currencyLabel}>{type}</Text>
                  <TextInput
                    style={additionalStyles.currencyInput}
                    value={String(editedLoot.currency[type] || 0)}
                    onChangeText={(text) => {
                      const value = parseInt(text) || 0;
                      setEditedLoot(prev => ({
                        ...prev,
                        currency: {
                          ...prev.currency,
                          [type]: value
                        }
                      }));
                    }}
                    keyboardType="numeric"
                    placeholderTextColor={THEME.text.light + '80'}
                  />
                </View>
              ))}
            </View>

            {/* Items Section */}
            <View style={additionalStyles.lootSection}>
              <View style={additionalStyles.lootHeader}>
                <Text style={additionalStyles.sectionTitle}>Items</Text>
                <TouchableOpacity
                  style={additionalStyles.addButton}
                  onPress={() => {
                    setEditedLoot(prev => ({
                      ...prev,
                      items: [...prev.items, { 
                        id: Date.now().toString(),
                        name: '',
                        quantity: 1,
                        addedBy: playerName 
                      }]
                    }));
                  }}
                >
                  <Text style={styles.buttonText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {editedLoot.items.map((item, index) => (
                <View key={item.id || index} style={additionalStyles.itemRow}>
                  <TextInput
                    style={[additionalStyles.itemInput, { flex: 2 }]}
                    value={item.name}
                    onChangeText={(text) => {
                      const newItems = [...editedLoot.items];
                      newItems[index] = { ...item, name: text };
                      setEditedLoot(prev => ({ ...prev, items: newItems }));
                    }}
                    placeholder="Item name"
                    placeholderTextColor={THEME.text.light + '80'}
                  />
                  <TextInput
                    style={[additionalStyles.itemInput, { width: 60 }]}
                    value={String(item.quantity)}
                    onChangeText={(text) => {
                      const newItems = [...editedLoot.items];
                      newItems[index] = { ...item, quantity: parseInt(text) || 1 };
                      setEditedLoot(prev => ({ ...prev, items: newItems }));
                    }}
                    keyboardType="numeric"
                    placeholder="Qty"
                    placeholderTextColor={THEME.text.light + '80'}
                  />
                  <TouchableOpacity
                    style={additionalStyles.removeButton}
                    onPress={() => {
                      setEditedLoot(prev => ({
                        ...prev,
                        items: prev.items.filter((_, i) => i !== index)
                      }));
                    }}
                  >
                    <Text style={styles.buttonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.closeButton]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: THEME.success }]}
              onPress={() => {
                onUpdate(editedLoot);
                onClose();
              }}
            >
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// Add this component definition before the App component
const GridZoomControls = memo(({ zoomLevel, setZoomLevel }) => {
  const debouncedZoom = debounce((newZoom) => {
    setZoomLevel(newZoom);
  }, 100);

  return (
    <View style={styles.zoomControls}>
      <TouchableOpacity
        style={styles.zoomButton}
        onPress={() => debouncedZoom(Math.max(0.5, zoomLevel - 0.1))}
      >
        <Text style={styles.buttonText}>-</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.zoomButton}
        onPress={() => debouncedZoom(Math.min(2, zoomLevel + 0.1))}
      >
        <Text style={styles.buttonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
});

// Add InventoryModal component
const InventoryModal = memo(({ visible, onClose, character, onUpdate }) => {
  const [editedInventory, setEditedInventory] = useState({
    currency: character?.currency || {
      CP: 0,
      SP: 0,
      EP: 0,
      GP: 0,
      PP: 0
    },
    inventory: character?.inventory || []
  });

  useEffect(() => {
    if (visible && character) {
      setEditedInventory({
        currency: character.currency || {
          CP: 0,
          SP: 0,
          EP: 0,
          GP: 0,
          PP: 0
        },
        inventory: character.inventory || []
      });
    }
  }, [visible, character]);

  if (!visible || !character) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={additionalStyles.characterSheet}>
          <TouchableOpacity 
            style={additionalStyles.closeButton}
            onPress={onClose}
          >
            <Text style={additionalStyles.closeButtonText}>×</Text>
          </TouchableOpacity>

          <Text style={additionalStyles.sectionTitle}>{character.name}'s Inventory</Text>

          <GestureScrollView>
            <View style={additionalStyles.lootSection}>
              {/* Currency */}
              {CURRENCY.map(currency => (
                <View key={currency} style={additionalStyles.currencyRow}>
                  <Text style={additionalStyles.currencyLabel}>{currency}</Text>
                  <TextInput
                    style={additionalStyles.currencyInput}
                    value={String(editedInventory.currency[currency] || 0)}
                    onChangeText={(text) => {
                      const value = parseInt(text) || 0;
                      setEditedInventory(prev => ({
                        ...prev,
                        currency: {
                          ...prev.currency,
                          [currency]: value
                        }
                      }));
                    }}
                    keyboardType="numeric"
                    placeholderTextColor={THEME.text.light + '80'}
                  />
                </View>
              ))}
            </View>

            <View style={additionalStyles.lootSection}>
              <View style={additionalStyles.lootHeader}>
                <Text style={additionalStyles.sectionTitle}>Items</Text>
                <TouchableOpacity
                  style={additionalStyles.addButton}
                  onPress={() => {
                    setEditedInventory(prev => ({
                      ...prev,
                      inventory: [...prev.inventory, { name: '', quantity: 1, notes: '', addedBy: character.name }]
                    }));
                  }}
                >
                  <Text style={styles.buttonText}>Add Item</Text>
                </TouchableOpacity>
              </View>

              {editedInventory.inventory.map((item, index) => (
                <View key={index} style={additionalStyles.itemRow}>
                  <View style={additionalStyles.itemInfo}>
                    <TextInput
                      style={[additionalStyles.itemInput, { flex: 2 }]}
                      value={item.name}
                      onChangeText={(text) => {
                        const newInventory = [...editedInventory.inventory];
                        newInventory[index] = { ...item, name: text };
                        setEditedInventory(prev => ({ ...prev, inventory: newInventory }));
                      }}
                      placeholder="Item name"
                      placeholderTextColor={THEME.text.light + '80'}
                    />
                    <TextInput
                      style={[additionalStyles.itemInput, { width: 60 }]}
                      value={String(item.quantity)}
                      onChangeText={(text) => {
                        const newInventory = [...editedInventory.inventory];
                        newInventory[index] = { ...item, quantity: parseInt(text) || 1 };
                        setEditedInventory(prev => ({ ...prev, inventory: newInventory }));
                      }}
                      keyboardType="numeric"
                      placeholder="Qty"
                      placeholderTextColor={THEME.text.light + '80'}
                    />
                    {item.addedBy === character.name && (
                      <TouchableOpacity
                        style={additionalStyles.removeButton}
                        onPress={() => {
                          setEditedInventory(prev => ({
                            ...prev,
                            inventory: prev.inventory.filter((_, i) => i !== index)
                          }));
                        }}
                      >
                        <Text style={styles.buttonText}>×</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  <Text style={additionalStyles.addedBy}>Added by: {item.addedBy}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: THEME.success }]}
              onPress={() => {
                onUpdate({
                  ...character,
                  currency: editedInventory.currency,
                  inventory: editedInventory.inventory
                });
                onClose();
              }}
            >
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
          </GestureScrollView>
        </View>
      </View>
    </Modal>
  );
});

// Add PlayerNameModal component
const PlayerNameModal = memo(({ visible, onSubmit }) => {
  const [name, setName] = useState('');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Enter Your Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={THEME.text.light + '80'}
            autoCapitalize="words"
          />
          <TouchableOpacity
            style={[styles.modalButton, { 
              backgroundColor: THEME.success,
              width: '100%',
              marginTop: 10
            }]}
            onPress={() => onSubmit(name)}
            disabled={!name.trim()}
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

// Add to styles
const viewerStyles = StyleSheet.create({
  viewersList: {
    marginTop: 15,
    padding: 10,
    backgroundColor: THEME.background.primary,
    borderRadius: 5,
  },
  viewersTitle: {
    color: THEME.text.light,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  viewerName: {
    color: THEME.text.light,
    opacity: 0.8,
    fontSize: 12,
    marginBottom: 2,
  },
});

// Add this function at the top level of the App component, before the state declarations
const calculateModifier = (score) => {
  return Math.floor((score - 10) / 2);
};

// Add this new component near the other modal components
const DiceResultModal = memo(({ visible, result, onClose }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible || !result) return null;

  return (
    <View style={{
      position: 'fixed', // Change from 'absolute' to 'fixed'
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999, // Increase zIndex to ensure it's above everything
      backgroundColor: 'rgba(0, 0, 0, 0.5)', // Add semi-transparent background
    }}>
      <View style={{
        backgroundColor: THEME.background.panel + 'E6',
        padding: 20,
        borderRadius: 10,
        alignItems: 'center',
        minWidth: 200,
        maxWidth: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
      }}>
        <Text style={{
          color: THEME.text.light,
          fontSize: 18,
          marginBottom: 5,
        }}>
          {result.dice} {result.rollType !== 'normal' ? `(${result.rollType})` : ''}
        </Text>
        <Text style={{
          color: THEME.accent,
          fontSize: 32,
          fontWeight: 'bold',
          marginBottom: 5,
        }}>
          {result.total}
        </Text>
        <Text style={{
          color: THEME.text.light + '80',
          fontSize: 14,
        }}>
          Rolls: [{result.rolls.join(', ')}]
          {result.modifier !== 0 && ` + ${result.modifier}`}
        </Text>
      </View>
    </View>
  );
});

// Add this new component near the other modal components
const DeleteCharacterModal = memo(({ visible, character, onClose, onConfirm }) => {
  const [confirmName, setConfirmName] = useState('');

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Delete Character</Text>
          <Text style={[styles.buttonText, { marginBottom: 10, textAlign: 'center' }]}>
            Type "{character?.name}" to confirm deletion
          </Text>
          <TextInput
            style={styles.input}
            value={confirmName}
            onChangeText={setConfirmName}
            placeholder="Character name"
            placeholderTextColor={THEME.text.light + '80'}
          />
          <View style={[styles.modalButtons, { marginTop: 15 }]}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: THEME.background.secondary }]}
              onPress={onClose}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton, 
                { 
                  backgroundColor: confirmName === character?.name ? THEME.danger : THEME.background.secondary,
                  opacity: confirmName === character?.name ? 1 : 0.5
                }
              ]}
              onPress={() => {
                if (confirmName === character?.name) {
                  onConfirm();
                }
              }}
              disabled={confirmName !== character?.name}
            >
              <Text style={styles.buttonText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
});

// Add this new component for the enemy selection modal
const EnemySelectModal = memo(({ visible, onClose, onSelect }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Enemy</Text>
          <ScrollView style={{ maxHeight: 300 }}>
            {COMMON_ENEMIES.map((enemy, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.enemyOption,
                  { backgroundColor: THEME.background.secondary }
                ]}
                onPress={() => onSelect(enemy)}
              >
                <Text style={styles.buttonText}>{enemy.name}</Text>
                <Text style={[styles.buttonText, { opacity: 0.7, fontSize: 12 }]}>
                  HP: {enemy.hp} • AC: {enemy.ac}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: THEME.background.secondary, marginTop: 10 }]}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

export default function App() {
  // Add calculateModifier here
  const calculateModifier = (score) => {
    return Math.floor((score - 10) / 2);
  };

  // State declarations
  const [roomCode, setRoomCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showRoomModal, setShowRoomModal] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(isSmallScreen ? 0.8 : 1);
  const [tokens, setTokens] = useState({});
  const [currentColor, setCurrentColor] = useState(COLORS[0]);
  const [initiative, setInitiative] = useState([]);
  const [inCombat, setInCombat] = useState(false);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [layers, setLayers] = useState(initialGameState.layers);
  const [diceHistory, setDiceHistory] = useState([]);
  const [advantage, setAdvantage] = useState(false);
  const [modifier, setModifier] = useState(0);
  const [selectedToken, setSelectedToken] = useState(null);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [partyLoot, setPartyLoot] = useState({
    currency: {
      CP: 0,
      SP: 0,
      EP: 0,
      GP: 0,
      PP: 0
    },
    items: [],
    currentViewer: null
  });
  const [showPartyLoot, setShowPartyLoot] = useState(false);
  const [diceQuantity, setDiceQuantity] = useState(1);
  const [characters, setCharacters] = useState([]);
  const [showCharacterSheet, setShowCharacterSheet] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [showInventory, setShowInventory] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [showPlayerNameModal, setShowPlayerNameModal] = useState(true);
  const [rollType, setRollType] = useState('normal'); // 'normal', 'advantage', or 'disadvantage'
  const [diceResult, setDiceResult] = useState(null);
  const [showDiceResult, setShowDiceResult] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDM, setIsDM] = useState(false);
  const [showEnemySelect, setShowEnemySelect] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(null);

  // Refs
  const firebaseRef = useRef(null);
  const unsubscribeRef = useRef(null);

  // Helper Functions
  const handleDisconnect = useCallback(() => {
    try {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      if (firebaseRef.current) {
        off(firebaseRef.current);
        firebaseRef.current = null;
      }

      // Reset room-specific state
      setIsConnected(false);
      setRoomCode('');
      setTokens({});
      setLayers(initialGameState.layers);
      setInitiative([]);
      setInCombat(false);
      setCurrentTurn(0);
      setDiceHistory([]);
      setAdvantage(false);
      setModifier(0);
      setSelectedToken(null);
      setShowTokenModal(false);
      setPartyLoot(initialGameState.partyLoot);
      setZoomLevel(isSmallScreen ? 0.8 : 1);
      // Don't clear characters or player name

    } catch (error) {
      console.error('Error during disconnect:', error);
      Alert.alert('Error', 'Failed to leave room properly. Please try again.');
    }
  }, []);

  const handleInitiativeRoll = useCallback(() => {
    if (!tokens || Object.keys(tokens).length === 0) {
      Alert.alert('Error', 'No tokens on the board');
      return;
    }

    const rolls = Object.entries(tokens).map(([position, token]) => {
      const roll = Math.floor(Math.random() * 20) + 1;
      const initiative = roll + (token.initiativeBonus || 0);
      return {
        position,
        initiative,
        details: `${token.name} (${initiative})`
      };
    });

    rolls.sort((a, b) => b.initiative - a.initiative);

    if (firebaseRef.current) {
      set(firebaseRef.current, {
        ...initialGameState,
        tokens,
        layers,
        initiative: rolls,
        inCombat: true,
        currentTurn: 0
      });
    }

    setInitiative(rolls);
    setInCombat(true);
    setCurrentTurn(0);
  }, [tokens, layers]);

  const rollDice = useCallback((sides) => {
    const allRolls = [];

    // Roll for each die in quantity
    for (let d = 0; d < diceQuantity; d++) {
      const rolls = [];
      const numRolls = rollType !== 'normal' ? 2 : 1;

      // Roll with advantage/disadvantage if enabled
      for (let i = 0; i < numRolls; i++) {
        rolls.push(Math.floor(Math.random() * sides) + 1);
      }

      const finalRoll = rollType === 'advantage' 
        ? Math.max(...rolls) 
        : rollType === 'disadvantage'
          ? Math.min(...rolls)
          : rolls[0];

      allRolls.push({
        rolls,
        total: finalRoll
      });
    }

    // Calculate grand total including modifier
    const grandTotal = allRolls.reduce((sum, roll) => sum + roll.total, 0) + modifier;

    const newResult = {
      dice: `${diceQuantity}d${sides}`,
      rolls: allRolls.map(r => r.rolls).flat(),
      individualTotals: allRolls.map(r => r.total),
      modifier,
      rollType,
      total: grandTotal,
      timestamp: Date.now()
    };

    setDiceHistory(prev => [newResult, ...prev.slice(0, 49)]);
    Vibration.vibrate(50);
  }, [rollType, modifier, diceQuantity]);

  const handleCellPress = useCallback(async (row, col) => {
    if (!firebaseRef.current) return;

    try {
      const position = `${row}-${col}`;
      const newTokens = { ...tokens };

      if (tokens[position]) {
        delete newTokens[position];
      } else {
        if (isDM) {
          setSelectedPosition(position);
          setShowEnemySelect(true);
          return;
        } else {
          // Check if a character is selected
          if (!selectedCharacter) {
            Alert.alert('No Character Selected', 'Please select a character from your list first.');
            return;
          }

          // Create token from selected character
          newTokens[position] = {
            name: selectedCharacter.name,
            color: currentColor,
            hp: selectedCharacter.hp,
            maxHp: selectedCharacter.maxHp,
            ac: selectedCharacter.ac,
            initiativeBonus: calculateModifier(selectedCharacter.abilityScores.DEX),
            effects: [],
            position,
            owner: playerName
          };
        }
      }

      // Update Firebase
      await set(firebaseRef.current, {
        tokens: newTokens,
        layers,
        initiative,
        inCombat,
        currentTurn,
        partyLoot,
        lastUpdate: Date.now()
      });

      setTokens(newTokens);
    } catch (error) {
      console.error('Error updating tokens:', error);
      Alert.alert('Error', 'Failed to update token');
    }
  }, [tokens, currentColor, layers, initiative, inCombat, currentTurn, partyLoot, selectedCharacter, playerName, isDM]);

  // Update the savePlayerData function
  const savePlayerData = useCallback(async (updatedCharacters) => {
    if (!playerName || !roomCode) return;

    try {
      // Save to both the room and a separate players collection
      const roomPlayerRef = ref(database, `rooms/${roomCode}/players/${playerName}`);
      const globalPlayerRef = ref(database, `players/${playerName}`);

      const playerData = {
        characters: updatedCharacters,
        lastUpdate: Date.now()
      };

      // Update both locations
      await Promise.all([
        set(roomPlayerRef, playerData),
        set(globalPlayerRef, playerData)
      ]);
    } catch (error) {
      console.error('Error saving player data:', error);
      Alert.alert('Error', 'Failed to save character data');
    }
  }, [playerName, roomCode]);

  // Update the connectToRoom function
  const connectToRoom = useCallback(async (code) => {
    if (!code.trim() || !playerName) {
      Alert.alert("Error", "Please enter a room code and player name");
      return;
    }

    setIsJoining(true);
    setIsLoading(true);

    try {
      // First try to load player's global data
      const globalPlayerRef = ref(database, `players/${playerName}`);
      const playerSnapshot = await get(globalPlayerRef);
      if (playerSnapshot.exists()) {
        const playerData = playerSnapshot.val();
        setCharacters(playerData.characters || []);
      }

      const gameRef = ref(database, `rooms/${code}`);
      firebaseRef.current = gameRef;

      // Check if room exists
      const snapshot = await get(gameRef);
      if (!snapshot.exists()) {
        await set(gameRef, initialGameState);
      }

      // Set up real-time listener
      const unsubscribe = onValue(gameRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setTokens(data.tokens || {});
          setLayers(data.layers || initialGameState.layers);
          setInitiative(data.initiative || []);
          setInCombat(data.inCombat || false);
          setCurrentTurn(data.currentTurn || 0);
          setPartyLoot(data.partyLoot || initialGameState.partyLoot);

          // Update characters from room data if they exist
          if (data.players && data.players[playerName]) {
            setCharacters(data.players[playerName].characters || []);
          }
        }
      });

      unsubscribeRef.current = unsubscribe;
      setRoomCode(code);
      setShowRoomModal(false);
      setIsConnected(true);

    } catch (error) {
      console.error('Connection error:', error);
      Alert.alert("Error", "Failed to join room. Please try again.");
      setIsConnected(false);
    } finally {
      setIsJoining(false);
      setIsLoading(false);
    }
  }, [playerName]);

  // Effects
  useEffect(() => {
    const handleOffline = () => {
      Alert.alert(
        'Connection Lost',
        'Please check your internet connection',
        [{ text: 'OK' }]
      );
    };

    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (firebaseRef.current) {
        off(firebaseRef.current);
      }
    };
  }, []);

  // Add to styles
  const layoutStyles = {
    sidePanel: {
      backgroundColor: THEME.background.panel,
      padding: 15,
      borderRadius: 10,
      marginBottom: 15,
      width: '100%',
    },
    sidePanelTitle: {
      color: THEME.text.light,
      fontSize: 18,
      fontWeight: 'bold',
      marginBottom: 10,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 10,
    },
    panelButton: {
      backgroundColor: THEME.background.primary,
      padding: 10,
      borderRadius: 5,
      alignItems: 'center',
      flex: 1,
    },
    panelButtonText: {
      color: THEME.text.light,
      fontWeight: 'bold',
    },
    characterItem: {
      padding: 10,
      borderRadius: 5,
      marginBottom: 5,
      backgroundColor: THEME.background.secondary,
    },
    characterInfo: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    characterName: {
      color: THEME.text.light,
      fontWeight: 'bold',
    },
    characterDetails: {
      color: THEME.text.light,
      opacity: 0.8,
    },
  };

  // Add the delete function in App component
  const handleDeleteCharacter = useCallback(async () => {
    if (!selectedCharacter) return;

    try {
      const newCharacters = characters.filter(char => char.name !== selectedCharacter.name);
      setCharacters(newCharacters);
      await savePlayerData(newCharacters);
      setSelectedCharacter(null);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting character:', error);
      Alert.alert('Error', 'Failed to delete character');
    }
  }, [selectedCharacter, characters, savePlayerData]);

  // Add the handleEnemySelect function
  const handleEnemySelect = useCallback(async (enemy) => {
    if (!selectedPosition || !firebaseRef.current) return;

    try {
      const newTokens = { ...tokens };
      newTokens[selectedPosition] = {
        ...enemy,
        position: selectedPosition,
        effects: [],
        owner: 'DM'
      };

      await set(firebaseRef.current, {
        tokens: newTokens,
        layers,
        initiative,
        inCombat,
        currentTurn,
        partyLoot,
        lastUpdate: Date.now()
      });

      setTokens(newTokens);
      setShowEnemySelect(false);
      setSelectedPosition(null);
    } catch (error) {
      console.error('Error adding enemy:', error);
      Alert.alert('Error', 'Failed to add enemy');
    }
  }, [selectedPosition, tokens, layers, initiative, inCombat, currentTurn, partyLoot]);

  // Main render return
  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkMode]}>
      <View style={styles.container}>
        {/* Modals stay at the top level */}
        <TokenModal 
          showTokenModal={showTokenModal}
          setShowTokenModal={setShowTokenModal}
          selectedToken={selectedToken}
          setSelectedToken={setSelectedToken}
          tokens={tokens}
          firebaseRef={firebaseRef}
          initialGameState={initialGameState}
          layers={layers}
          initiative={initiative}
          inCombat={inCombat}
          currentTurn={currentTurn}
          THEME={THEME}
        />

        <RoomModal 
          showRoomModal={showRoomModal}
          setShowRoomModal={setShowRoomModal}
          isConnected={isConnected}
          roomCode={roomCode}
          setRoomCode={setRoomCode}
          isJoining={isJoining}
          connectToRoom={connectToRoom}
        />

        <PlayerNameModal
          visible={showPlayerNameModal && !playerName}
          onSubmit={(name) => {
            setPlayerName(name);
            setShowPlayerNameModal(false);
            setIsConnected(true);
          }}
        />

        <PartyLootModal
          visible={showPartyLoot}
          onClose={() => setShowPartyLoot(false)}
          partyLoot={partyLoot}
          playerName={playerName}
          onUpdate={(updatedLoot) => {
            setPartyLoot(updatedLoot);
            if (firebaseRef.current) {
              set(firebaseRef.current, {
                ...initialGameState,
                tokens,
                layers,
                initiative,
                inCombat,
                currentTurn,
                partyLoot: updatedLoot
              });
            }
          }}
        />

        <CharacterSheetModal
          visible={showCharacterSheet}
          onClose={() => setShowCharacterSheet(false)}
          character={selectedCharacter || {
            name: '',
            class: '',
            level: 1,
            owner: playerName,
            proficiencyBonus: 2,
            hp: 0,
            maxHp: 0,
            ac: 10,
            abilityScores: {
              STR: 10,
              DEX: 10,
              CON: 10,
              INT: 10,
              WIS: 10,
              CHA: 10
            },
            proficientSkills: [],
            currency: {
              CP: 0,
              SP: 0,
              EP: 0,
              GP: 0,
              PP: 0
            },
            items: [],
            inventory: []
          }}
          characters={characters}
          onUpdate={async (updatedCharacter) => {
            try {
              if (!updatedCharacter) {
                throw new Error('No character data to save');
              }

              // Create new array with updated character
              const newCharacters = selectedCharacter
                ? characters.map(char => 
                    char.name === selectedCharacter.name ? updatedCharacter : char
                  )
                : [...characters, updatedCharacter];

              // Update local state first
              setCharacters(newCharacters);

              // Save to Firebase
              const playerRef = ref(database, `players/${playerName}`);
              await set(playerRef, {
                characters: newCharacters,
                lastUpdate: Date.now()
              });

              // Also save to room data
              if (firebaseRef.current) {
                const roomPlayerRef = ref(database, `rooms/${roomCode}/players/${playerName}`);
                await set(roomPlayerRef, {
                  characters: newCharacters,
                  lastUpdate: Date.now()
                });
              }

              setShowCharacterSheet(false);

            } catch (error) {
              console.error('Error saving character:', error);
              Alert.alert('Error', 'Failed to save character');
            }
          }}
        />

        <InventoryModal
          visible={showInventory}
          onClose={() => setShowInventory(false)}
          character={selectedCharacter}
          onUpdate={async (updatedCharacter) => {
            try {
              const newCharacters = characters.map(char => 
                char.name === selectedCharacter.name ? updatedCharacter : char
              );

              setCharacters(newCharacters);
              await savePlayerData(newCharacters);
              setShowInventory(false);
            } catch (error) {
              console.error('Error saving inventory:', error);
              Alert.alert('Error', 'Failed to save inventory');
            }
          }}
        />

        {!isConnected ? (
          <View style={styles.loadingContainer}>
            {isLoading ? (
              <View style={{ alignItems: 'center' }}>
                <ActivityIndicator size="large" color={THEME.accent} />
                <Text style={[styles.loadingText, { marginTop: 20 }]}>
                  Connecting to room...
                </Text>
              </View>
            ) : (
              <Text style={styles.loadingText}>
                Enter a room code to begin
              </Text>
            )}
          </View>
        ) : (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>D&D Combat Tracker</Text>
              <ScrollView 
                horizontal={isSmallScreen} 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.controls}
              >
                <TouchableOpacity 
                  style={[styles.controlButton, { backgroundColor: THEME.primary }]}
                  onPress={() => setShowRoomModal(true)}
                >
                  <Text style={styles.buttonText}>Room: {roomCode}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: THEME.primary }]}
                  onPress={handleInitiativeRoll}
                >
                  <Text style={styles.buttonText}>Roll Initiative</Text>
                </TouchableOpacity>

                {inCombat && (
                  <>
                    <TouchableOpacity
                      style={[styles.controlButton, { backgroundColor: THEME.success }]}
                      onPress={() => {
                        const nextTurn = (currentTurn + 1) % initiative.length;
                        setCurrentTurn(nextTurn);
                        if (firebaseRef.current) {
                          set(firebaseRef.current, {
                            ...initialGameState,
                            tokens,
                            layers,
                            initiative,
                            inCombat: true,
                            currentTurn: nextTurn
                          });
                        }
                      }}
                    >
                      <Text style={styles.buttonText}>Next Turn</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.controlButton, { backgroundColor: THEME.danger }]}
                      onPress={() => {
                        if (firebaseRef.current) {
                          set(firebaseRef.current, {
                            ...initialGameState,
                            tokens,
                            layers,
                            initiative: [],
                            inCombat: false,
                            currentTurn: 0
                          });
                        }
                        setInitiative([]);
                        setInCombat(false);
                        setCurrentTurn(0);
                      }}
                    >
                      <Text style={styles.buttonText}>End Combat</Text>
                    </TouchableOpacity>
                  </>
                )}

                <TouchableOpacity
                  style={[styles.controlButton, { backgroundColor: THEME.danger }]}
                  onPress={() => {
                    Alert.alert(
                      "Leave Room",
                      "Are you sure you want to leave this room?",
                      [
                        { text: "Cancel", style: "cancel" },
                        { 
                          text: "Leave", 
                          style: "destructive",
                          onPress: () => {
                            // Disconnect from Firebase
                            if (unsubscribeRef.current) {
                              unsubscribeRef.current();
                              unsubscribeRef.current = null;
                            }
                            if (firebaseRef.current) {
                              off(firebaseRef.current);
                              firebaseRef.current = null;
                            }

                            // Reset state
                            setIsConnected(false);
                            setRoomCode('');
                            setTokens({});
                            setInitiative([]);
                            setInCombat(false);
                            setCurrentTurn(0);
                            setPartyLoot(initialGameState.partyLoot);
                            setShowRoomModal(true);
                            setShowPlayerNameModal(true);
                          }
                        }
                      ]
                    );
                  }}
                >
                  <Text style={styles.buttonText}>Leave Room</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[
                    styles.controlButton,
                    isDM && styles.dmToggleActive
                  ]}
                  onPress={() => setIsDM(!isDM)}
                >
                  <Text style={styles.buttonText}>DM Mode</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
            <ScrollView style={styles.content}>
              <View style={styles.mainArea}>
                {/* Grid Section */}
                <View style={styles.gridSection}>
                  <ScrollView 
                    horizontal 
                    contentContainerStyle={{ minWidth: '100%' }}
                  >
                    <ScrollView>
                      <View style={[
                        styles.gridContainer,
                        { transform: [{ scale: zoomLevel }] }
                      ]}>
                        {/* Color Picker */}
                        <View style={styles.colorPicker}>
                          {COLORS.map(color => (
                            <TouchableOpacity
                              key={color}
                              style={[
                                styles.colorButton,
                                { backgroundColor: color },
                                color === currentColor && styles.selectedColor
                              ]}
                              onPress={() => setCurrentColor(color)}
                            />
                          ))}
                        </View>

                        {/* Grid */}
                        {Array.from({ length: GRID_SIZE }).map((_, row) => (
                          <View key={row} style={styles.row}>
                            {Array.from({ length: GRID_SIZE }).map((_, col) => {
                              const position = `${row}-${col}`;
                              const token = tokens[position];
                              const isCurrentTurn = inCombat && 
                                initiative[currentTurn]?.position === position;

                              return (
                                <TouchableOpacity
                                  key={col}
                                  style={[
                                    styles.cell,
                                    token && { backgroundColor: token.color },
                                    isCurrentTurn && styles.currentTurn
                                  ]}
                                  onPress={() => handleCellPress(row, col)}
                                  onLongPress={() => {
                                    if (token) {
                                      setSelectedToken({ ...token, position });
                                      setShowTokenModal(true);
                                    }
                                  }}
                                >
                                  {token && (
                                    <View style={styles.tokenContent}>
                                      <Text style={[
                                        styles.tokenText,
                                        { color: token.color === '#ffffff' ? '#000000' : '#ffffff' }
                                      ]} numberOfLines={1}>
                                        {token.name}
                                      </Text>
                                      <Text style={[
                                        styles.tokenHp,
                                        { color: token.color === '#ffffff' ? '#000000' : '#ffffff' }
                                      ]}>
                                        HP: {token.hp}/{token.maxHp}
                                      </Text>
                                      <Text style={[
                                        styles.tokenHp,
                                        { color: token.color === '#ffffff' ? '#000000' : '#ffffff' }
                                      ]}>
                                        AC: {token.ac}
                                      </Text>
                                      {token.effects && token.effects.length > 0 && (
                                        <View style={statusStyles.tokenEffects}>
                                          {token.effects.map(effect => {
                                            const statusEffect = STATUS_EFFECTS.find(e => e.id === effect);
                                            return statusEffect ? (
                                              <Text key={effect} style={statusStyles.effectIcon}>
                                                {statusEffect.icon}
                                              </Text>
                                            ) : null;
                                          })}
                                        </View>
                                      )}
                                    </View>
                                  )}
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ))}
                      </View>
                    </ScrollView>
                  </ScrollView>
                  <GridZoomControls 
                    zoomLevel={zoomLevel}
                    setZoomLevel={setZoomLevel}
                  />
                </View>

                {/* Sidebar */}
                <View style={styles.sidebar}>
                  {/* Character Management Panel */}
                  <View style={layoutStyles.sidePanel}>
                    <Text style={layoutStyles.sidePanelTitle}>Character Management</Text>

                    {/* Character List */}
                    <ScrollView style={{ maxHeight: 200 }}>
                      {characters
                        .filter(char => char.owner === playerName)
                        .map((char, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              layoutStyles.characterItem, 
                              { 
                                marginBottom: 8,
                                backgroundColor: selectedCharacter?.name === char.name ? THEME.accent + '40' : 'transparent'
                              }
                            ]}
                            onPress={() => setSelectedCharacter(char)}
                          >
                            <View style={layoutStyles.characterInfo}>
                              <Text style={layoutStyles.characterName}>{char.name}</Text>
                              <Text style={layoutStyles.characterDetails}>
                                Level {char.level} {char.class}
                              </Text>
                              <Text style={[layoutStyles.characterDetails, { opacity: 0.8 }]}>
                                HP: {char.hp}/{char.maxHp} • AC: {char.ac}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {/* Action Buttons */}
                    <View style={[layoutStyles.buttonRow, { marginTop: 10 }]}>
                      <TouchableOpacity
                        style={layoutStyles.panelButton}
                        onPress={() => {
                          setSelectedCharacter(null);
                          setShowCharacterSheet(true);
                        }}
                      >
                        <Text style={layoutStyles.panelButtonText}>New Character</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={layoutStyles.panelButton}
                        onPress={() => setShowPartyLoot(true)}
                      >
                        <Text style={layoutStyles.panelButtonText}>Party Loot</Text>
                      </TouchableOpacity>
                    </View>

                    {selectedCharacter && (
                      <>
                        <View style={[layoutStyles.buttonRow, { marginTop: 5 }]}>
                          <TouchableOpacity
                            style={[layoutStyles.panelButton, { backgroundColor: THEME.accent }]}
                            onPress={() => {
                              setShowCharacterSheet(true);
                            }}
                          >
                            <Text style={layoutStyles.panelButtonText}>Character Sheet</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[layoutStyles.panelButton, { backgroundColor: THEME.success }]}
                            onPress={() => {
                              setShowInventory(true);
                            }}
                          >
                            <Text style={layoutStyles.panelButtonText}>Inventory</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={[layoutStyles.buttonRow, { marginTop: 5 }]}>
                          <TouchableOpacity
                            style={[layoutStyles.panelButton, { backgroundColor: THEME.danger }]}
                            onPress={() => setShowDeleteModal(true)}
                          >
                            <Text style={layoutStyles.panelButtonText}>Delete Character</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    )}
                  </View>

                  {/* Dice Roller Panel */}
                  <View style={diceStyles.dicePanel}>
                    <Text style={diceStyles.diceTitle}>Dice Roller</Text>

                    <View style={diceStyles.diceControls}>
                      <View style={diceStyles.controlsRow}>
                        <View style={diceStyles.controlGroup}>
                          <TouchableOpacity
                            style={[
                              diceStyles.controlButton,
                              rollType === 'advantage' && diceStyles.controlActive,
                              rollType === 'advantage' && { backgroundColor: THEME.success }
                            ]}
                            onPress={() => setRollType(current => 
                              current === 'advantage' ? 'normal' : 'advantage'
                            )}
                          >
                            <Text style={styles.buttonText}>Advantage</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              diceStyles.controlButton,
                              rollType === 'disadvantage' && diceStyles.controlActive,
                              rollType === 'disadvantage' && { backgroundColor: THEME.danger }
                            ]}
                            onPress={() => setRollType(current => 
                              current === 'disadvantage' ? 'normal' : 'disadvantage'
                            )}
                          >
                            <Text style={styles.buttonText}>Disadvantage</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={diceStyles.controlsRow}>
                        <View style={diceStyles.modifierGroup}>
                          <Text style={diceStyles.modifierLabel}>Modifier</Text>
                          <TextInput
                            style={diceStyles.modifierInput}
                            value={String(modifier)}
                            onChangeText={text => {
                              const num = parseInt(text) || 0;
                              setModifier(num);
                            }}
                            keyboardType="numeric"
                            selectTextOnFocus={true}
                          />
                        </View>
                        <View style={diceStyles.quantityGroup}>
                          <Text style={diceStyles.quantityLabel}>Quantity</Text>
                          <TextInput
                            style={diceStyles.quantityInput}
                            value={String(diceQuantity)}
                            onChangeText={text => {
                              const num = parseInt(text) || 1;
                              setDiceQuantity(Math.max(1, Math.min(num, 100)));
                            }}
                            keyboardType="numeric"
                            selectTextOnFocus={true}
                          />
                        </View>
                      </View>
                    </View>

                    <View style={diceStyles.diceGrid}>
                      {DICE_TYPES.map(({ sides }) => (
                        <TouchableOpacity
                          key={sides}
                          style={[diceStyles.diceButton, { backgroundColor: THEME.background.secondary }]}
                          onPress={() => {
                            const rolls = [];
                            for (let i = 0; i < diceQuantity; i++) {
                              if (rollType !== 'normal') {
                                const roll1 = Math.floor(Math.random() * sides) + 1;
                                const roll2 = Math.floor(Math.random() * sides) + 1;
                                rolls.push(rollType === 'advantage' ? Math.max(roll1, roll2) : Math.min(roll1, roll2));
                              } else {
                                rolls.push(Math.floor(Math.random() * sides) + 1);
                              }
                            }

                            const total = rolls.reduce((sum, roll) => sum + roll, 0) + modifier;
                            const result = {
                              dice: `${diceQuantity}d${sides}`,
                              rolls,
                              modifier,
                              rollType,
                              total
                            };

                            setDiceResult(result);
                            setShowDiceResult(true);
                            Vibration.vibrate(50);
                          }}
                        >
                          <Text style={diceStyles.diceButtonText}>d{sides}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Add the DiceResultModal to your render */}
                  <DiceResultModal
                    visible={showDiceResult}
                    result={diceResult}
                    onClose={() => setShowDiceResult(false)}
                  />

                  {/* Initiative Panel */}
                  {inCombat && initiative.length > 0 && (
                    <View style={styles.initiativeList}>
                      <Text style={styles.boxTitle}>Initiative Order</Text>
                      <ScrollView style={styles.initiativeScroll}>
                        {initiative.map((item, index) => (
                          <View 
                            key={item.position}
                            style={[
                              styles.initiativeItem,
                              index === currentTurn && styles.currentInitiative
                            ]}
                          >
                            <Text style={[
                              styles.initiativeText,
                              index === currentTurn && styles.currentInitiativeText
                            ]}>
                              {item.details}
                            </Text>
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>
          </>
        )}
      </View>
      <DeleteCharacterModal
        visible={showDeleteModal}
        character={selectedCharacter}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteCharacter}
      />
      <EnemySelectModal
        visible={showEnemySelect}
        onClose={() => {
          setShowEnemySelect(false);
          setSelectedPosition(null);
        }}
        onSelect={handleEnemySelect}
      />
    </SafeAreaView>
  );
}
