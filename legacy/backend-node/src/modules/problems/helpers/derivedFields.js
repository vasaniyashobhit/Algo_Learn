/**
 * Fields computed from a problem's own data. The model sets them before validation;
 * bulk writes (which skip hooks) should spread this into each document.
 */
export const problemDerivedFields = ({ tags = [], editorial } = {}) => ({
  tagCount: tags.length,
  hasEditorial: typeof editorial === 'string' && editorial.trim().length > 0,
});
