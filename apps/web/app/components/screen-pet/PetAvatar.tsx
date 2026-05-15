import { SpritePetRenderer, type SpritePetState } from "./SpritePetRenderer";
import { spritePetRegistry } from "virtual:pets";
import type { PetTheme } from "~/store/pet";

interface PetAvatarProps {
  theme: PetTheme;
  isSpeaking?: boolean;
  isListening?: boolean;
  isLoading?: boolean;
  isJumping?: boolean;
  isFailed?: boolean;
  isHovered?: boolean;
  dragDirection?: "left" | "right" | null;
  size?: number;
}

function getPetState({
  isSpeaking,
  isListening,
  isLoading,
  isJumping,
  isFailed,
  isHovered,
  dragDirection,
}: {
  isSpeaking?: boolean;
  isListening?: boolean;
  isLoading?: boolean;
  isJumping?: boolean;
  isFailed?: boolean;
  isHovered?: boolean;
  dragDirection?: "left" | "right" | null;
}): SpritePetState {
  if (isFailed) return "failed";
  if (isJumping) return "jumping";
  if (isSpeaking) return "waving";
  if (isListening) return "waiting";
  if (isLoading) return "running";
  if (dragDirection === "right") return "runRight";
  if (dragDirection === "left") return "runLeft";
  if (isHovered) return "review";
  return "idle";
}

function isSpritePet(theme: string): boolean {
  return spritePetRegistry.pets.some((p) => p.id === theme);
}

export function PetAvatar({
  theme,
  isSpeaking,
  isListening,
  isLoading,
  isJumping,
  isFailed,
  isHovered,
  dragDirection,
  size = 80,
}: PetAvatarProps) {
  const petId = isSpritePet(theme) ? theme : (spritePetRegistry.pets[0]?.id ?? "usagi");

  return (
    <SpritePetRenderer
      petId={petId}
      state={getPetState({
        isSpeaking,
        isListening,
        isLoading,
        isJumping,
        isFailed,
        isHovered,
        dragDirection,
      })}
      scale={size / 192}
      fps={isSpeaking || isListening || isJumping || dragDirection ? 12 : 6}
    />
  );
}
