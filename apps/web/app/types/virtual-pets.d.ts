declare module "virtual:pets" {
  interface PetRegistryEntry {
    id: string;
    displayName: string;
    spritesheetPath: string;
    cellWidth: number;
    cellHeight: number;
    cols: number;
    rows: number;
  }

  export const spritePetRegistry: { pets: PetRegistryEntry[] };
}
