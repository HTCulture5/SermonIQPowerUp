
/**
 * Biblical and Ministry Keyword Library
 * Provides regex-based detection for church service engagement tracking.
 */

export const BIBLE_KEYWORDS = [
  "Grace", "Faith", "Redemption", "Salvation", "Gospel", "Amen", "Alleluia", "Glory", "Hallelujah",
  "Apostle", "Prophet", "Evangelist", "Pastor", "Teacher", "Anointing", "Breakthrough", "Blessing",
  "Covenant", "Deliverance", "Disciple", "Eternal", "Fellowship", "Healer", "Holiness", "Intercession",
  "Judgment", "Kingdom", "Lord", "Mercy", "Miracle", "Praise", "Prayer", "Repentance", "Restoration",
  "Revelation", "Sacrifice", "Sanctification", "Scripture", "Sermon", "Spirit", "Tabernacle", "Testimony",
  "Trinity", "Wisdom", "Worship", "Zion", "Abba", "Almighty", "Alpha", "Omega", "Bethel", "Calvary",
  "Cross", "Crown", "Eden", "Exodus", "Genesis", "Golgotha", "Jordan", "Manna", "Messiah", "Passover",
  "Pentecost", "Psalms", "Resurrection", "Sabbath", "Sinai", "Temple", "Tithes", "Offering", "Unleavened",
  "Vengeance", "Vineyard", "Witness", "Yoke", "Zeal", "Adoption", "Assurance", "Baptism", "Chasten",
  "Comfort", "Compassion", "Condemnation", "Confession", "Consecration", "Consolation", "Contentment",
  "Contrite", "Conviction", "Council", "Courage", "Creation", "Daily", "Darkness", "Light", "Day", "Night",
  "Deacon", "Elder", "Bishop", "Minister", "Saint", "Sinner", "Savior", "Deceit", "Decree", "Defile",
  "Deity", "Delight", "Departure", "Despise", "Destitute", "Devotion", "Diligence", "Direction",
  "Discerning", "Discipline", "Dishonor", "Disobedience", "Dispensation", "Divine", "Doctrine", "Dominion",
  "Doors", "Doubt", "Dwell", "Earnest", "Edify", "Effectual", "Elect", "Embrace", "Endure", "Enlighten",
  "Enmity", "Enthroned", "Envy", "Epistle", "Equip", "Equity", "Error", "Escape", "Establish", "Estate",
  "Esteem", "Eternal", "Everlasting", "Evidence", "Evil", "Exalt", "Examine", "Exceeding", "Excellent",
  "Exhort", "Expectation", "Experience", "Eyes", "Face", "Fainting", "Faithful", "Falling", "Family",
  "Famine", "Fast", "Favor", "Fear", "Feast", "Feeding", "Feeling", "Fellow", "Female", "Male", "Ferment",
  "Fervent", "Fidelity", "Fiery", "Fighting", "Figure", "Filling", "Filth", "Final", "Finding", "Finger",
  "Finish", "Fire", "First", "Fishers", "Flame", "Flesh", "Flock", "Flood", "Flowing", "Fly", "Fold",
  "Follow", "Folly", "Food", "Fool", "Foot", "Forbid", "Force", "Foreign", "Foreknow", "Foreordain",
  "Forever", "Forget", "Forgive", "Former", "Fornication", "Forsake", "Fortress", "Fortune", "Found",
  "Foundation", "Fountain", "Four", "Foursquare", "Fragrance", "Frame", "Frankincense", "Fraud", "Free",
  "Freedom", "Fresh", "Friend", "Fruit", "Fulfill", "Full", "Fullness", "Future", "Gain", "Garden",
  "Garment", "Gate", "Gather", "Gave", "Genealogy", "Generation", "Gentile", "Gentle", "Gift", "Girded",
  "Give", "Glad", "Glass", "Glean", "Glimpse", "Glorify", "Glow", "Gnash", "Goat", "Gold", "Good",
  "Goodness", "Governing", "Governor", "Grab", "Grace", "Gracious", "Grain", "Grand", "Grape", "Grass",
  "Grave", "Great", "Green", "Greet", "Grief", "Ground", "Grow", "Guarantee", "Guard", "Guest", "Guide",
  "Guilt", "Gulf", "Habitation", "Hail", "Hair", "Half", "Hallow", "Halo", "Hand", "Handmaid", "Hang",
  "Happen", "Happy", "Harbor", "Hard", "Harden", "Harlot", "Harm", "Harp", "Harvest", "Haste", "Hate",
  "Haughty", "Head", "Heal", "Health", "Heap", "Hear", "Heart", "Heated", "Heaven", "Heavy", "Hedge",
  "Heed", "Heel", "Heir", "Hell", "Help", "Hem", "Hen", "Herb", "Herd", "Heritage", "Hewn", "Hide",
  "High", "Hill", "Hind", "Hire", "Hiss", "History", "Hither", "Hoary", "Hold", "Hole", "Holiday",
  "Holiness", "Holocaust", "Holy", "Home", "Honest", "Honey", "Honor", "Hoof", "Hook", "Hope", "Horn",
  "Horror", "Horse", "Hosanna", "Hospital", "Host", "Hot", "Hour", "House", "Howl", "Humble", "Humility",
  "Hunger", "Hunt", "Hurl", "Hurt", "Husband", "Hush", "Husk", "Hymn", "Hypocrite", "Hyssop", "Ice",
  "Idea", "Idol", "Ignorance", "Ill", "Image", "Imagine", "Immortal", "Immutable", "Impart", "Impenitent",
  "Imperfect", "Importunate", "Impossible", "Imprison", "Impure", "Iniquity", "Inn", "Inner", "Innocent",
  "Inscribe", "Inside", "Inspiration", "Instant", "Instruction", "Instrument", "Insult", "Integrity",
  "Intellect", "Intend", "Intercede", "Interest", "Intermix", "Internal", "Interpret", "Intimate",
  "Introduce", "Invisible", "Inward", "Iron", "Island", "Ivory", "Jacob", "Jail", "Jubilee", "Judge"
];

export const BIBLICAL_FIGURES = [
  "Isaiah", "Jeremiah", "Ezekiel", "Daniel",
  "Hosea", "Joel", "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah", "Malachi",
  "Adam", "Eve", "Noah", "Abraham", "Isaac", "Jacob", "Joseph", "Moses", "Aaron", "Joshua", "Samuel", "David", "Solomon",
  "Miriam", "Deborah", "Huldah", "Esther", "Ruth", "Hannah", "Mary", "Martha", "Lydia", "Priscilla", "Mary Magdalene",
  "John the Baptist", "Peter", "Paul", "Silas", "Barnabas", "Timothy", "Stephen", "Lazarus", "Philip", "Titus", "Anna", "Aquila",
  "Job", "Elijah", "Elisha", "Nehemiah", "Ezra", "Gideon", "Samson", "Jonathan", "Boaz", "Caleb"
];

/**
 * Generates a compiled regex to match biblical and engagement keywords.
 * Returns a function that checks for keyword matches in a text block.
 */
export const createBiblicalRegex = () => {
  // Join keywords with word boundaries to ensure whole-word matching
  const pattern = `\\b(${BIBLE_KEYWORDS.join('|')})\\b`;
  return new RegExp(pattern, 'gi');
};

/**
 * Generates a compiled regex to match biblical figures.
 */
export const createFigureRegex = () => {
  const escaped = BIBLICAL_FIGURES.map(f => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const pattern = `\\b(${escaped})\\b`;
  return new RegExp(pattern, 'gi');
};

/**
 * Checks a string for matches against our biblical keyword list.
 */
export const detectKeywords = (text: string): string[] => {
  const regex = createBiblicalRegex();
  const matches = text.match(regex);
  if (!matches) return [];
  // Return unique lowercase matches
  return Array.from(new Set(matches.map(m => m.toLowerCase())));
};

/**
 * Checks a string for matches against our biblical figures list.
 */
export const detectFigures = (text: string): string[] => {
  const regex = createFigureRegex();
  const matches = text.match(regex);
  if (!matches) return [];
  return Array.from(new Set(matches));
};

/**
 * Detects specific scripture references (e.g., "John 3:16", "1 Corinthians 13:4-8")
 */
export const detectScriptureReferences = (text: string): string[] => {
  // Regex pattern for Bible references: 
  // (Optional Number) BookName (Space) Chapter:Verse(s)
  const pattern = /\b(?:[12]\s)?(?:[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s\d+:\d+(?:-\d+)?\b/g;
  const matches = text.match(pattern);
  if (!matches) return [];
  return Array.from(new Set(matches));
};
