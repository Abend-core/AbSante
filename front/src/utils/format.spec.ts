import { describe, expect, it } from 'vitest'
import { displayName, formatPhone, formatSiret, titleCase } from './format'

describe('formatPhone', () => {
  it.each([
    ['0467336733', '04 67 33 67 33'],
    ['04 67 33 67 33', '04 67 33 67 33'],
    ['04.67.33.67.33', '04 67 33 67 33'],
  ])('met en forme %s', (raw, expected) => expect(formatPhone(raw)).toBe(expected))

  it.each(['+33467336733', '12345', '046733673', 'poste 42'])('laisse %s tel quel (jamais inventé ni tronqué)', (raw) => {
    expect(formatPhone(raw)).toBe(raw)
  })
})

describe('formatSiret', () => {
  it('groupe un SIRET (14 chiffres)', () => expect(formatSiret('44154525800036')).toBe('441 545 258 00036'))
  it('groupe un SIREN (9 chiffres)', () => expect(formatSiret('340785161')).toBe('340 785 161'))
  it('laisse tel quel un numéro de forme inattendue', () => expect(formatSiret('ABC123')).toBe('ABC123'))
})

describe('titleCase', () => {
  it.each([
    ['SOLENNE', 'Solenne'],
    ['ANNE-CLAIRE', 'Anne-Claire'],
    ['JEAN PIERRE', 'Jean Pierre'],
    ["D'ARTAGNAN", "D'Artagnan"],
    ['ÉLODIE', 'Élodie'],
  ])('%s -> %s', (raw, expected) => expect(titleCase(raw)).toBe(expected))
})

describe('displayName', () => {
  it("préfère la civilité d'exercice, sinon la civilité", () => {
    expect(displayName({ civiliteExercice: 'Docteur', civilite: 'Monsieur', prenom: 'PAUL', nom: 'MARTIN' })).toBe('Docteur Paul MARTIN')
    expect(displayName({ civiliteExercice: null, civilite: 'Madame', prenom: 'SOLENNE', nom: 'BRUN' })).toBe('Madame Solenne BRUN')
  })

  it("omet les parties absentes sans jamais écrire « null »", () => {
    expect(displayName({ civiliteExercice: null, civilite: null, prenom: null, nom: 'BRUN' })).toBe('BRUN')
    expect(displayName({ civiliteExercice: null, civilite: null, prenom: null, nom: null })).toBe('')
  })
})
