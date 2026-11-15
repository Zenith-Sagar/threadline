import { describe, expect, it } from 'vitest';
import { CARD_FOR_TERM, SCIENCE_CARDS, cardById, cardForChain, wordCount } from '@/ui/science-cards';
import { GLOSSARY } from '@/ui/glossary';

describe('Science Cards: content rules', () => {
  it('has at most six cards, each 80 words or fewer', () => {
    expect(SCIENCE_CARDS.length).toBeLessThanOrEqual(6);
    for (const c of SCIENCE_CARDS) expect(wordCount(c.body), c.id).toBeLessThanOrEqual(80);
  });

  it('covers the six required topics', () => {
    expect(SCIENCE_CARDS.map((c) => c.id).sort()).toEqual(
      ['delta-v', 'downlink', 'eclipse-batteries', 'failures', 'solar-panels', 'storms'].sort(),
    );
  });

  it('contains no digits at all, so no real-world number can be written from memory', () => {
    for (const c of SCIENCE_CARDS) {
      expect(c.body, c.id).not.toMatch(/\d/);
      expect(c.title, c.id).not.toMatch(/\d/);
    }
  });

  it('shows at least one https source per card, with a title, a publisher and a read date', () => {
    for (const c of SCIENCE_CARDS) {
      expect(c.sources.length, c.id).toBeGreaterThan(0);
      for (const s of c.sources) {
        expect(s.url, c.id).toMatch(/^https:\/\//);
        expect(s.title.length).toBeGreaterThan(3);
        expect(s.publisher.length).toBeGreaterThan(2);
        expect(s.retrieved).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('every card says what is a game simplification (so a reader cannot mistake it for fact)', () => {
    for (const c of SCIENCE_CARDS) expect(c.body, c.id).toMatch(/In the game/);
  });

  it('maps glossary terms and cause chains to real cards', () => {
    for (const [term, id] of Object.entries(CARD_FOR_TERM)) {
      expect(term in GLOSSARY, term).toBe(true);
      expect(cardById(id).id).toBe(id);
    }
    expect(cardForChain('launch:vehicle')).toBe('failures');
    expect(cardForChain('storage:instrument:radar')).toBe('downlink');
    expect(cardForChain('safe-mode:instrument:radar')).toBe('eclipse-batteries');
    expect(cardForChain('radiation:response')).toBe('storms');
  });
});
