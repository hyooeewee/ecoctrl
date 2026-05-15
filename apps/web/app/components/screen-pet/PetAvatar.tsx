import { TechRobot } from "./themes/TechRobot";
import { CuteAnimal } from "./themes/CuteAnimal";
import { MinimalGeo } from "./themes/MinimalGeo";
import type { PetTheme } from "~/store/pet";

interface PetAvatarProps {
  theme: PetTheme;
  isSpeaking?: boolean;
  isListening?: boolean;
  isLoading?: boolean;
  size?: number;
}

export function PetAvatar({ theme, ...props }: PetAvatarProps) {
  switch (theme) {
    case "cute-animal":
      return <CuteAnimal {...props} />;
    case "minimal-geo":
      return <MinimalGeo {...props} />;
    case "tech-robot":
    default:
      return <TechRobot {...props} />;
  }
}
