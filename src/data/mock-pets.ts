export type VibeTag =
  | "low-energy"
  | "high-energy"
  | "good-with-pets"
  | "kid-friendly"
  | "independent"
  | "cuddly"
  | "playful"
  | "calm"
  | "adventurous"
  | "quirky";

export type Species = "dog" | "cat" | "bird" | "reptile" | "small-animal";

export type PetStatus = "available" | "pending" | "adopted";

export type AgeCategory = "baby" | "young" | "adult" | "senior";

export interface Pet {
  id: string;
  name: string;
  species: Species;
  breed: string;
  age: string;
  ageCategory: AgeCategory;
  gender: "male" | "female";
  vibes: VibeTag[];
  bio: string;
  funFact: string;
  rehomingReason: string;
  location: string;
  distanceKm: number;
  photos: string[];
  healthVerified: boolean;
  adoptionFee: number;
  status: PetStatus;
  rehomerId: string;
  createdAt: string;
}

// Unsplash pet photos
const dogPhotos = [
  "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=600&h=600&fit=crop",
];

const catPhotos = [
  "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=600&h=600&fit=crop",
];

const birdPhotos = [
  "https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1444464666168-49d633b86797?w=600&h=600&fit=crop",
];

const reptilePhotos = [
  "https://images.unsplash.com/photo-1504450874802-0ba2bcd659e3?w=600&h=600&fit=crop",
  "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=600&h=600&fit=crop",
];

export const mockPets: Pet[] = [
  {
    id: "p1",
    name: "Biscuit",
    species: "dog",
    breed: "Golden Retriever",
    age: "3 years",
    ageCategory: "adult",
    gender: "male",
    vibes: ["high-energy", "kid-friendly", "playful", "cuddly"],
    bio: "Biscuit is a golden ball of sunshine who thinks every human is his best friend. He'll bring you a shoe (not always matching) every time you come home.",
    funFact: "Can balance a treat on his nose for exactly 0.3 seconds before eating it.",
    rehomingReason: "Family relocating overseas",
    location: "Portland, OR",
    distanceKm: 8,
    photos: [dogPhotos[0], dogPhotos[1]],
    healthVerified: true,
    adoptionFee: 250,
    status: "available",
    rehomerId: "u2",
    createdAt: "2026-02-20",
  },
  {
    id: "p2",
    name: "Whiskers",
    species: "cat",
    breed: "Tabby",
    age: "5 years",
    ageCategory: "adult",
    gender: "female",
    vibes: ["calm", "independent", "cuddly"],
    bio: "Whiskers is a dignified lady who enjoys sunbeams, cardboard boxes, and judging you silently from across the room.",
    funFact: "Has claimed 4 different cardboard boxes as her 'offices'.",
    rehomingReason: "Owner developed allergies",
    location: "Seattle, WA",
    distanceKm: 12,
    photos: [catPhotos[0], catPhotos[1]],
    healthVerified: true,
    adoptionFee: 150,
    status: "available",
    rehomerId: "u2",
    createdAt: "2026-02-18",
  },
  {
    id: "p3",
    name: "Mango",
    species: "bird",
    breed: "Cockatiel",
    age: "2 years",
    ageCategory: "young",
    gender: "male",
    vibes: ["quirky", "playful", "cuddly"],
    bio: "Mango can whistle the first 4 notes of 'Happy Birthday' and gets extremely excited about mirrors. He's basically a tiny dramatic diva.",
    funFact: "Dances when he hears the microwave beep.",
    rehomingReason: "Moving to a smaller apartment",
    location: "Austin, TX",
    distanceKm: 5,
    photos: [birdPhotos[0], birdPhotos[1]],
    healthVerified: false,
    adoptionFee: 75,
    status: "available",
    rehomerId: "u3",
    createdAt: "2026-02-22",
  },
  {
    id: "p4",
    name: "Sir Scales",
    species: "reptile",
    breed: "Leopard Gecko",
    age: "1 year",
    ageCategory: "young",
    gender: "male",
    vibes: ["calm", "low-energy", "independent", "quirky"],
    bio: "Sir Scales is the most chill roommate you'll ever have. He eats, he basks, he stares philosophically into the void. Living his best life.",
    funFact: "His tail wiggles when he spots a cricket from across the tank.",
    rehomingReason: "Kids went to college",
    location: "Denver, CO",
    distanceKm: 20,
    photos: [reptilePhotos[0], reptilePhotos[1]],
    healthVerified: true,
    adoptionFee: 50,
    status: "available",
    rehomerId: "u3",
    createdAt: "2026-02-15",
  },
  {
    id: "p5",
    name: "Noodle",
    species: "dog",
    breed: "Dachshund",
    age: "4 years",
    ageCategory: "adult",
    gender: "female",
    vibes: ["cuddly", "low-energy", "kid-friendly", "calm"],
    bio: "Noodle is 90% belly and 10% stubbornness. She loves blanket burritos, belly rubs, and absolutely refusing to walk in the rain.",
    funFact: "Can sleep for 16 hours straight and still yawn when she wakes up.",
    rehomingReason: "Owner's health changes",
    location: "San Francisco, CA",
    distanceKm: 15,
    photos: [dogPhotos[2], dogPhotos[3]],
    healthVerified: true,
    adoptionFee: 200,
    status: "available",
    rehomerId: "u2",
    createdAt: "2026-02-19",
  },
  {
    id: "p6",
    name: "Chaos",
    species: "cat",
    breed: "Maine Coon",
    age: "2 years",
    ageCategory: "young",
    gender: "male",
    vibes: ["high-energy", "adventurous", "playful", "good-with-pets"],
    bio: "Chaos lives up to his name. He opens cabinets, steals socks, and somehow learned to turn on the kitchen faucet. He's basically a toddler in a fur coat.",
    funFact: "Once knocked over a Christmas tree and looked proud about it.",
    rehomingReason: "Household changes",
    location: "Chicago, IL",
    distanceKm: 3,
    photos: [catPhotos[2], catPhotos[3]],
    healthVerified: true,
    adoptionFee: 175,
    status: "available",
    rehomerId: "u3",
    createdAt: "2026-02-21",
  },
  {
    id: "p7",
    name: "Thunderpaws",
    species: "dog",
    breed: "Husky Mix",
    age: "1 year",
    ageCategory: "young",
    gender: "male",
    vibes: ["high-energy", "adventurous", "playful", "good-with-pets"],
    bio: "Thunderpaws has two modes: ZOOM and SLEEP. There is no in between. He will howl at ambulances, other dogs, and sometimes just the wind.",
    funFact: "Ran into a glass door twice. Same door.",
    rehomingReason: "Needs more space to run",
    location: "Boulder, CO",
    distanceKm: 10,
    photos: [dogPhotos[4], dogPhotos[0]],
    healthVerified: true,
    adoptionFee: 300,
    status: "available",
    rehomerId: "u2",
    createdAt: "2026-02-23",
  },
  {
    id: "p8",
    name: "Peaches",
    species: "cat",
    breed: "Persian",
    age: "7 years",
    ageCategory: "senior",
    gender: "female",
    vibes: ["calm", "cuddly", "low-energy", "independent"],
    bio: "Peaches is a fluffy cloud of serenity. She enjoys being brushed, sitting on warm laptops, and looking disappointed when dinner is 5 minutes late.",
    funFact: "Purrs so loudly you can hear her from the next room.",
    rehomingReason: "Owner is moving to assisted living",
    location: "Phoenix, AZ",
    distanceKm: 7,
    photos: [catPhotos[0], catPhotos[2]],
    healthVerified: true,
    adoptionFee: 100,
    status: "pending",
    rehomerId: "u3",
    createdAt: "2026-02-10",
  },
  {
    id: "p9",
    name: "Pickle",
    species: "small-animal",
    breed: "Holland Lop Rabbit",
    age: "1 year",
    ageCategory: "young",
    gender: "female",
    vibes: ["calm", "cuddly", "kid-friendly", "quirky"],
    bio: "Pickle is a floppy-eared bundle of joy who binkies around the living room like she just won the lottery. She'll nudge your hand for pets and thump when she wants a treat.",
    funFact: "Does a full 360 spin when she hears the treat bag open.",
    rehomingReason: "Family downsizing",
    location: "Nashville, TN",
    distanceKm: 6,
    photos: ["https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=600&h=600&fit=crop", "https://images.unsplash.com/photo-1452857297128-d9c29adba80b?w=600&h=600&fit=crop"],
    healthVerified: true,
    adoptionFee: 60,
    status: "available",
    rehomerId: "u2",
    createdAt: "2026-02-17",
  },
  {
    id: "p10",
    name: "Captain Fluff",
    species: "dog",
    breed: "Pomeranian",
    age: "6 years",
    ageCategory: "adult",
    gender: "male",
    vibes: ["cuddly", "quirky", "playful", "good-with-pets"],
    bio: "Captain Fluff believes he is a Great Dane trapped in a cotton ball's body. He barks at his own reflection and demands to be carried up stairs.",
    funFact: "Once got lost inside a pile of laundry for 20 minutes.",
    rehomingReason: "Owner traveling long-term for work",
    location: "Miami, FL",
    distanceKm: 18,
    photos: [dogPhotos[1], dogPhotos[3]],
    healthVerified: false,
    adoptionFee: 225,
    status: "available",
    rehomerId: "u3",
    createdAt: "2026-02-14",
  },
];
