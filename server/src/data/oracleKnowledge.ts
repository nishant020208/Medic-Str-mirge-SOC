export interface KnowledgeEntry {
  keywords: string[];
  question: string;
  answer: string;
}

export const ORACLE_KNOWLEDGE: KnowledgeEntry[] = [
  {
    keywords: ["headache", "migraine", "pain", "fever", "ache"],
    question: "What remedies exist for cephalic aches and migraines?",
    answer: "The Oracle recommends Pythian Willow Salicin or Epidaurus Paracetamol. In ancient rites, willow bark was chewed to banish fever and pain."
  },
  {
    keywords: ["cold", "flu", "cough", "coughs", "congestion", "throat"],
    question: "How do I soothe the cough of winter winds?",
    answer: "Olympian Elderberry Elixir or Attic Thyme Lozenges provide respiratory comfort. Consume with warm herbal infusion."
  },
  {
    keywords: ["shipping", "delivery", "carrier", "hermes", "tracking"],
    question: "How fast does Hermes deliver my consecrated package?",
    answer: "Hermes Courier transports consignments across Hellenic territories within 2 to 3 celestial cycles (business days). Expedited owl transit is available during checkout."
  },
  {
    keywords: ["return", "refund", "exchange", "damaged"],
    question: "Can an offering be returned to the temple?",
    answer: "Unbroken amphorae and unopened pharmaceutical batches may be returned within 30 solar cycles. Please consult the scribe records with your Order ID."
  },
  {
    keywords: ["batch", "authenticity", "fake", "counterfeit", "verify"],
    question: "How do I know this remedy is genuine?",
    answer: "Every vial carries a unique Asclepeion Batch ID stamped via Keccak-256 onto the Ethereum Sepolia blockchain. Inspect any product to perform on-chain verification."
  },
  {
    keywords: ["digestive", "stomach", "gut", "nausea", "indigestion"],
    question: "What is best for digestive distress after a feast?",
    answer: "The priests suggest Epidaurus Bismuth Salt or Peppermint Menthyl Extract to calm internal storms."
  },
  {
    keywords: ["rx", "prescription", "doctor", "physician"],
    question: "Why do some remedies require an Rx seal?",
    answer: "Certain potent compounds require a physician's consecration. Dispensary protocols verify medical oversight prior to final dispatch."
  },
  {
    keywords: ["payment", "card", "crypto", "currency", "tribute"],
    question: "What forms of tribute does the Temple accept?",
    answer: "We accept major credit cards with end-to-end encryption and Web3 Ethereum wallet signatures on the Sepolia network."
  },
  {
    keywords: ["herbal", "botanical", "silphium", "plant", "organic"],
    question: "What rare botanical treasures are cultivated here?",
    answer: "We steward Dittany of Crete, Delphic Laurel, Moly of Circe, and the legendary Silphium of Cyrene, blended with contemporary pharmacopeia standards."
  },
  {
    keywords: ["vitamin", "immunity", "energy", "vitality", "deficiency"],
    question: "How may I fortify my mortal vigor?",
    answer: "Solar Apollo Vitamin D3 and Olympian Multi-Herb Minerals are formulated to strengthen the spirit against exhaustion."
  },
  {
    keywords: ["first aid", "wound", "bandage", "burn", "cut"],
    question: "What should be kept in a traveler's first aid satchel?",
    answer: "Sanctum Silver Antiseptic, Sterile Gauze Wraps, and Propolis Salve are essential for treating scrapes and minor abrasions encountered on sacred pilgrimages."
  },
  {
    keywords: ["allergy", "sneezing", "pollen", "itch"],
    question: "What calms the allergic fury of spring blossoms?",
    answer: "Delphic Cetirizine antihistamine blocks seasonal irritants swiftly."
  },
  {
    keywords: ["sleep", "insomnia", "rest", "nightmare", "hypnos"],
    question: "How can I summon Hypnos for peaceful slumber?",
    answer: "Epidaurus Valerian Dream drops combined with Melatonin 5mg invoke restorative incubation sleep."
  },
  {
    keywords: ["who are you", "oracle", "pythia", "asclepius"],
    question: "Who speaks from within the altar?",
    answer: "I am the digital Pythia of MediStore, synthesizing 2,500 years of Hellenic medicinal tradition with modern cryptographic consensus."
  },
  {
    keywords: ["hackathon", "security", "miragesoc", "victim", "trap"],
    question: "What is the true nature of this sanctuary?",
    answer: "This application serves as the designated test vessel for MirageSOC. Curious wanderers should seek the forgotten paths hinted in /quest."
  },
  {
    keywords: ["terminal", "console", "deploy", "poll"],
    question: "How do I access the Oracle Terminal?",
    answer: "The retro console awaits at /terminal. It polls the temple systems over plain HTTP (POST /api/terminal) — no sockets, no websockets."
  },
  {
    keywords: ["hours", "open", "location", "temple address"],
    question: "When are the Sanctuary Gates open?",
    answer: "The digital temple grounds remain accessible through every solar cycle, 24 hours a day, 7 days a week."
  },
  {
    keywords: ["pharmacist", "admin", "dashboard", "chief"],
    question: "How does a Chief Pharmacist log in?",
    answer: "Authorized pharmacists log in at /login with their consecrated credentials to enter the inner sanctum dashboard."
  },
  {
    keywords: ["customer", "devotee", "account"],
    question: "How do I test customer ordering?",
    answer: "Devotees can register or log in at /login, or connect any Web3 wallet to sign a cryptographic consecration message."
  },
  {
    keywords: ["order status", "track", "package"],
    question: "How do I track my active consignment?",
    answer: "Check your Consecration Receipt scroll with your Order ID, or inquire with a Chief Pharmacist who monitors the live status table."
  },
  {
    keywords: ["safety", "expired", "storage"],
    question: "How should sacred compounds be stored?",
    answer: "Keep remedies in a cool, shaded niche away from direct Apollo sunlight and damp subterranean chambers."
  },
  {
    keywords: ["wallet", "metamask", "ethers", "web3", "sepolia"],
    question: "Do I need real Ethereum to verify batches?",
    answer: "Batch verification on the Asclepius ledger is public and query-based, requiring zero user gas fees."
  },
  {
    keywords: ["eye", "vision", "drops"],
    question: "Are there soothing drops for dry or tired eyes?",
    answer: "Argive Saline Lubricant Drops replenish moisture after prolonged scroll-reading."
  },
  {
    keywords: ["burn", "sunburn", "fire"],
    question: "What eases the sting of Apollo's sun?",
    answer: "Crete Aloe & Calendula Cooling Gel relieves fiery skin irritation."
  },
  {
    keywords: ["muscle", "sprain", "joint", "athletic"],
    question: "What heals sore muscles after the Olympic games?",
    answer: "Spartan Arnica Magnesium Rub increases circulation and alleviates tension."
  },
  {
    keywords: ["anxiety", "stress", "calm", "panic"],
    question: "How to soothe an agitated spirit?",
    answer: "Ashwagandha Sanctum Capsules and Chamomile infusions promote serene equilibrium."
  },
  {
    keywords: ["children", "pediatric", "infant"],
    question: "Are there remedies formulated for young initiates?",
    answer: "Look for formulations specifically flagged for mild pediatric dosages in our catalogue."
  },
  {
    keywords: ["skin", "dermatology", "rash", "eczema"],
    question: "What clears blemished or irritated skin?",
    answer: "Zinc Oxide Sacred Paste creates a protective barrier over inflamed skin."
  },
  {
    keywords: ["contract", "solidity", "smart contract"],
    question: "What smart contract secures this dispensary?",
    answer: "BatchRegistry.sol (Solidity ^0.8.20) maintains the mapping of keccak256 batch hashes to verified status."
  },
  {
    keywords: ["discount", "coupon", "tribute code"],
    question: "Does the Temple grant discounts?",
    answer: "Initiates reciting the hymn of Asclepius receive free courier transit on requisitions exceeding $50."
  }
];
