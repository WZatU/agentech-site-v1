export function selectSoleProfile(
  selectedProfileId: number | null,
  profiles: ReadonlyArray<{ id: number }>
) {
  if (selectedProfileId !== null || profiles.length !== 1) {
    return selectedProfileId;
  }

  return profiles[0].id;
}
