import { useEffect, useState } from "react";
import { petsApi, type PetEntry } from "~/lib/pets-api";

let cachedPets: PetEntry[] | null = null;

export function usePets() {
  const [pets, setPets] = useState<PetEntry[]>(cachedPets ?? []);
  const [loading, setLoading] = useState(cachedPets === null);

  useEffect(() => {
    if (cachedPets) {
      setPets(cachedPets);
      setLoading(false);
      return;
    }
    petsApi
      .list()
      .then((data) => {
        cachedPets = data;
        setPets(data);
      })
      .catch(() => setPets([]))
      .finally(() => setLoading(false));
  }, []);

  return { pets, loading };
}
