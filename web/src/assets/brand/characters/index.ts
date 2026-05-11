import vetcardCat from "./vetcard-cat.png";
import vetcardCharacterLineup from "./vetcard-character-lineup.png";
import vetcardDog from "./vetcard-dog.png";
import vetcardParrot from "./vetcard-parrot.png";

export const vetcardCharacters = {
  dog: {
    label: "VetCard dog",
    src: vetcardDog,
  },
  cat: {
    label: "VetCard cat",
    src: vetcardCat,
  },
  parrot: {
    label: "VetCard parrot",
    src: vetcardParrot,
  },
  lineup: {
    label: "VetCard character lineup",
    src: vetcardCharacterLineup,
  },
} as const;

export { vetcardCat, vetcardCharacterLineup, vetcardDog, vetcardParrot };
