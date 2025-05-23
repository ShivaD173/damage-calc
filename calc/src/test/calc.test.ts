/* eslint-disable max-len */

import type {AbilityName, Terrain, Weather} from '../data/interface';
import {inGen, inGens, tests} from './helper';

describe('calc', () => {
  describe('Multi-Gen', () => {
    inGens(4, 7, ({gen, calculate, Pokemon, Move}) => {
      test(`Grass Knot (gen ${gen})`, () => {
        const result = calculate(Pokemon('Groudon'), Pokemon('Groudon'), Move('Grass Knot'));
        expect(result.range()).toEqual([190, 224]);
      });
    });

    inGens(4, 7, ({gen, calculate, Pokemon, Move}) => {
      test(`Arceus Plate (gen ${gen})`, () => {
        const result = calculate(
          Pokemon('Arceus', {item: 'Meadow Plate'}),
          Pokemon('Blastoise'),
          Move('Judgment')
        );
        expect(result.range()).toEqual([194, 230]);
        expect(result.desc()).toBe(
          '0 SpA Meadow Plate Arceus Judgment vs. 0 HP / 0 SpD Blastoise: 194-230 (64.8 - 76.9%) -- guaranteed 2HKO'
        );
      });
    });

    inGens(1, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`Night Shade / Seismic Toss (gen ${gen})`, () => {
        const mew = Pokemon('Mew', {level: 50});
        const vulpix = Pokemon('Vulpix');
        for (const move of [Move('Seismic Toss'), Move('Night Shade')]) {
          const result = calculate(mew, vulpix, move);
          expect(result.damage).toBe(50);
          expect(result.desc()).toBe(
            gen < 3
              ? `Lvl 50 Mew ${move.name} vs. Vulpix: 50-50 (17.9 - 17.9%) -- guaranteed 6HKO`
              : `Lvl 50 Mew ${move.name} vs. 0 HP Vulpix: 50-50 (23 - 23%) -- guaranteed 5HKO`
          );
        }
      });
    });

    tests('Comet Punch', ({gen, calculate, Pokemon, Move}) => {
      expect(calculate(Pokemon('Snorlax'), Pokemon('Vulpix'), Move('Comet Punch'))).toMatch(gen, {
        1: {range: [108, 129], desc: 'Snorlax Comet Punch (3 hits) vs. Vulpix', result: '(38.7 - 46.2%) -- guaranteed 3HKO'},
        3: {range: [132, 156], desc: '0 Atk Snorlax Comet Punch (3 hits) vs. 0 HP / 0 Def Vulpix', result: '(60.8 - 71.8%) -- guaranteed 2HKO'},
        4: {range: [129, 156], result: '(59.4 - 71.8%) -- guaranteed 2HKO'},
      });
    });

    inGens(1, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`Immunity (gen ${gen})`, () => {
        expect(calculate(Pokemon('Snorlax'), Pokemon('Gengar'), Move('Hyper Beam')).damage).toBe(0);
      });
    });

    inGens(1, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`Non-damaging (gen ${gen})`, () => {
        const result = calculate(Pokemon('Snorlax'), Pokemon('Vulpix'), Move('Barrier'));
        expect(result.damage).toBe(0);
        expect(result.desc()).toBe('Snorlax Barrier vs. Vulpix: 0-0 (0 - 0%)');
      });
    });

    inGens(1, 9, ({gen, calculate, Pokemon, Move, Field}) => {
      test(`Protect (gen ${gen})`, () => {
        const field = Field({defenderSide: {isProtected: true}});
        const snorlax = Pokemon('Snorlax');
        const chansey = Pokemon('Chansey');
        expect(calculate(snorlax, chansey, Move('Hyper Beam'), field).damage).toBe(0);
      });
    });

    inGens(1, 9, ({gen, calculate, Pokemon, Move, Field}) => {
      test(`Critical hits ignore attack decreases (gen ${gen})`, () => {
        const field = Field({defenderSide: {isReflect: true}});

        const mew = Pokemon('Mew', {status: 'brn'});
        const vulpix = Pokemon('Vulpix');
        const explosion = Move('Explosion', {isCrit: true});
        let result = calculate(mew, vulpix, explosion, field);
        mew.boosts.atk = 2;
        vulpix.boosts.def = 2;
        if (gen < 2) {
          expect(result.range()).toEqual([799, 939]);
          expect(result.desc()).toBe(
            'Mew Explosion vs. Vulpix on a critical hit: 799-939 (286.3 - 336.5%) -- guaranteed OHKO'
          );
        } else if (gen < 5 && gen > 2) {
          expect(result.range()).toEqual([729, 858]);
          expect(result.desc()).toBe(
            '0 Atk burned Mew Explosion vs. 0 HP / 0 Def Vulpix on a critical hit: 729-858 (335.9 - 395.3%) -- guaranteed OHKO'
          );
        } else if (gen === 5) {
          expect(result.range()).toEqual([364, 429]);
          expect(result.desc()).toBe(
            '0 Atk burned Mew Explosion vs. 0 HP / 0 Def Vulpix on a critical hit: 364-429 (167.7 - 197.6%) -- guaranteed OHKO'
          );
        } else if (gen >= 6) {
          expect(result.range()).toEqual([273, 321]);
          expect(result.desc()).toBe(
            '0 Atk burned Mew Explosion vs. 0 HP / 0 Def Vulpix on a critical hit: 273-321 (125.8 - 147.9%) -- guaranteed OHKO'
          );
        }
        explosion.isCrit = false;
        result = calculate(mew, vulpix, explosion, field);
        if (gen === 1) {
          expect(result.range()).toEqual([102, 120]);
        } else if (gen === 2) {
          expect(result.range()).toEqual([149, 176]);
        } else if (gen > 2 && gen < 5) {
          expect(result.range()).toEqual([182, 215]);
        } else {
          expect(result.range()).toEqual([91, 107]);
        }
      });
    });

    inGens(1, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`Struggle vs. Ghost (gen ${gen})`, () => {
        const result = calculate(Pokemon('Mew'), Pokemon('Gengar'), Move('Struggle'));
        if (gen < 2) {
          expect(result.range()[1]).toBe(0);
        } else {
          expect(result.range()[1]).toBeGreaterThan(0);
        }
      });
    });

    inGens(3, 9, ({gen, calculate, Pokemon, Move, Field}) => {
      test(`Weather Ball should change type depending on the weather (gen ${gen})`, () => {
        const weathers = [
          {
            weather: 'Sun', type: 'Fire', damage: {
              adv: {range: [346, 408], desc: '(149.7 - 176.6%) -- guaranteed OHKO'},
              dpp: {range: [342, 404], desc: '(148 - 174.8%) -- guaranteed OHKO'},
              modern: {range: [344, 408], desc: '(148.9 - 176.6%) -- guaranteed OHKO'},
            },
          },
          {
            weather: 'Rain', type: 'Water', damage: {
              adv: {range: [86, 102], desc: '(37.2 - 44.1%) -- guaranteed 3HKO'},
              dpp: {range: [85, 101], desc: '(36.7 - 43.7%) -- guaranteed 3HKO'},
              modern: {range: [86, 102], desc: '(37.2 - 44.1%) -- guaranteed 3HKO'},
            },
          },
          {
            weather: 'Sand', type: 'Rock', damage: {
              adv: {
                range: [96, 114],
                desc: '(41.5 - 49.3%) -- 82.4% chance to 2HKO after sandstorm damage',
              },
              dpp: {
                range: [77, 91],
                desc: '(33.3 - 39.3%) -- guaranteed 3HKO after sandstorm damage',
              },
              modern: {
                range: [77, 91],
                desc: '(33.3 - 39.3%) -- guaranteed 3HKO after sandstorm damage',
              },
            },
          },
          {
            weather: 'Hail', type: 'Ice', damage: {
              adv: {
                range: [234, 276],
                desc: '(101.2 - 119.4%) -- guaranteed OHKO',
              },
              dpp: {
                range: [230, 272],
                desc: '(99.5 - 117.7%) -- 93.8% chance to OHKO (guaranteed OHKO after hail damage)',
              },
              modern: {
                range: [230, 272],
                desc: '(99.5 - 117.7%) -- 93.8% chance to OHKO (guaranteed OHKO after hail damage)',
              },
            },
          },
        ];

        for (const {weather, type, damage} of weathers) {
          const dmg = gen === 3 ? damage.adv : gen === 4 ? damage.dpp : damage.modern;
          const [atk, def] = gen === 3 && type === 'Rock' ? ['Atk', 'Def'] : ['SpA', 'SpD'];

          const result = calculate(
            Pokemon('Castform'),
            Pokemon('Bulbasaur'),
            Move('Weather Ball'),
            Field({weather: weather as Weather})
          );
          expect(result.range()).toEqual(dmg.range);
          expect(result.desc()).toBe(
            `0 ${atk} Castform Weather Ball (100 BP ${type}) vs. 0 HP / 0 ${def} Bulbasaur in ${weather}: ${dmg.range[0]}-${dmg.range[1]} ${dmg.desc}`
          );
        }
      });
    });

    inGens(6, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`Flying Press (gen ${gen})`, () => {
        const attacker = Pokemon('Hawlucha');
        const flyingPress = Move('Flying Press');
        // Test it is 4x dmg if weak to flying and fighting
        const result = calculate(attacker, Pokemon('Cacturne'), flyingPress);
        if (gen === 6) {
          expect(result.range()).toEqual([484, 576]);
          expect(result.desc()).toBe(
            '0 Atk Hawlucha Flying Press vs. 0 HP / 0 Def Cacturne: 484-576 (172.2 - 204.9%) -- guaranteed OHKO'
          );
        } else {
          expect(result.range()).toEqual([612, 720]);
          expect(result.desc()).toBe(
            '0 Atk Hawlucha Flying Press vs. 0 HP / 0 Def Cacturne: 612-720 (217.7 - 256.2%) -- guaranteed OHKO'
          );
        }

        // Test still maintains fighting immunities
        const result2 = calculate(attacker, Pokemon('Spiritomb'), flyingPress);
        expect(result2.range()).toEqual([0, 0]);

        // Test fighting immunities can be overridden
        const scrappyAttacker = Pokemon('Hawlucha', {'ability': 'Scrappy'});
        const ringTargetSpiritomb = Pokemon('Spiritomb', {'item': 'Ring Target'});
        const result3 = calculate(attacker, ringTargetSpiritomb, flyingPress);
        const result4 = calculate(scrappyAttacker, Pokemon('Spiritomb'), flyingPress);
        if (gen === 6) {
          expect(result3.range()).toEqual([152, 180]);
          expect(result4.range()).toEqual([152, 180]);
        } else {
          expect(result3.range()).toEqual([188, 224]);
          expect(result4.range()).toEqual([188, 224]);
        }
      });
    });

    inGens(6, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`Thousand Arrows and Ring Target Should negate damage nullfiers (gen ${gen})`, () => {
        const result = calculate(Pokemon('Zygarde'), Pokemon('Swellow'), Move('Thousand Arrows'));
        expect(result.range()).toEqual([147, 174]);
        expect(result.desc()).toBe(
          '0 Atk Zygarde Thousand Arrows vs. 0 HP / 0 Def Swellow: 147-174 (56.3 - 66.6%) -- guaranteed 2HKO'
        );
      });
    });

    inGens(5, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`Ring Target should negate type nullfiers (gen ${gen})`, () => {
        const attacker = Pokemon('Mew');
        const defender = Pokemon('Skarmory', {'item': 'Ring Target'});
        const result = calculate(attacker, defender, Move('Sludge Bomb'));
        expect(result.range()).toEqual([87, 103]);
        expect(result.desc()).toBe(
          '0 SpA Mew Sludge Bomb vs. 0 HP / 0 SpD Skarmory: 87-103 (32.1 - 38%) -- 94.6% chance to 3HKO'
        );
        const result2 = calculate(attacker, defender, Move('Earth Power'));
        expect(result2.range()).toEqual([174, 206]);
        expect(result2.desc()).toBe(
          '0 SpA Mew Earth Power vs. 0 HP / 0 SpD Skarmory: 174-206 (64.2 - 76%) -- guaranteed 2HKO'
        );
      });
    });

    describe('IVs are shown if applicable', () => {
      inGens(3, 9, ({gen, calculate, Pokemon, Move}) => {
        test(`Gen ${gen}`, () => {
          const ivs = {spa: 9, spd: 9, hp: 9};
          const evs = {spa: 9, spd: 9, hp: 9};
          let result = calculate(Pokemon('Mew', {ivs}), Pokemon('Mew', {evs}), Move('Psychic'));
          expect(result.desc()).toBe('0 SpA 9 IVs Mew Psychic vs. 9 HP / 9 SpD Mew: 43-51 (12.5 - 14.8%) -- possible 7HKO');
          result = calculate(Pokemon('Mew', {evs}), Pokemon('Mew', {ivs}), Move('Psychic'));
          expect(result.desc()).toBe('9 SpA Mew Psychic vs. 0 HP 9 IVs / 0 SpD 9 IVs Mew: 54-64 (16.9 - 20%) -- possible 5HKO');
        });
      });
    });

    inGens(4, 9, ({gen, calculate, Pokemon, Move}) => {
      const zapdos = Pokemon('Zapdos', {item: 'Iron Ball'});
      if (gen === 4) {
        test(`Iron Ball negates ground immunities (gen ${gen})`, () => {
          const result = calculate(Pokemon('Vibrava'), zapdos, Move('Earthquake'));
          expect(result.range()).toEqual([186, 218]);
          expect(result.desc()).toBe(
            '0 Atk Vibrava Earthquake vs. 0 HP / 0 Def Zapdos: 186-218 (57.9 - 67.9%) -- guaranteed 2HKO'
          );
        });
      } else {
        test(`Iron Ball Should negate damage nullifiers (gen ${gen})`, () => {
          const result = calculate(Pokemon('Vibrava'), zapdos, Move('Earthquake'));
          expect(result.range()).toEqual([93, 109]);
          expect(result.desc()).toBe(
            '0 Atk Vibrava Earthquake vs. 0 HP / 0 Def Zapdos: 93-109 (28.9 - 33.9%) -- 1.2% chance to 3HKO'
          );
        });
      }
      test(`Iron Ball negates levitate (gen ${gen})`, () => {
        const result = calculate(Pokemon('Poliwrath'), Pokemon('Mismagius', {item: 'Iron Ball'}), Move('Mud Shot'));
        expect(result.range()).toEqual([29, 35]);
        expect(result.desc()).toBe(
          '0 SpA Poliwrath Mud Shot vs. 0 HP / 0 SpD Mismagius: 29-35 (11.1 - 13.4%) -- possible 8HKO'
        );
      });
    });

    inGens(5, 9, ({gen, calculate, Pokemon, Move, Field}) => {
      const dragonite = Pokemon('Dragonite', {ability: 'Multiscale'});
      const dragonite1 = Pokemon('Dragonite', {ability: 'Multiscale', curHP: 69});
      const dragonite2 = Pokemon('Dragonite', {ability: 'Shadow Shield', item: 'Heavy-Duty Boots'});
      if (gen > 7) {
        test(`Multiscale and Shadow Shield halves damage even if there are hazzards if holding Heavy-Duty Boots (gen ${gen})`, () => {
          const field = Field({defenderSide: {isSR: true}});
          const result = calculate(Pokemon('Abomasnow'), dragonite2, Move('Blizzard'), field);
          expect(result.range()).toEqual([222, 264]);
          expect(result.desc()).toBe(
            '0 SpA Abomasnow Blizzard vs. 0 HP / 0 SpD Shadow Shield Dragonite: 222-264 (68.7 - 81.7%) -- guaranteed 2HKO'
          );
        });
      }
      test(`Multiscale and Shadow Shield should not halve damage if less than 100% HP (gen ${gen})`, () => {
        const result = calculate(Pokemon('Abomasnow'), dragonite1, Move('Ice Shard'));
        expect(result.range()).toEqual([168, 204]);
        expect(result.desc()).toBe(
          '0 Atk Abomasnow Ice Shard vs. 0 HP / 0 Def Dragonite: 168-204 (52 - 63.1%) -- guaranteed OHKO'
        );
      });
      test(`Multiscale and Shadow Shield Should halve damage taken (gen ${gen})`, () => {
        const result = calculate(Pokemon('Abomasnow'), dragonite, Move('Ice Shard'));
        expect(result.range()).toEqual([84, 102]);
        expect(result.desc()).toBe(
          '0 Atk Abomasnow Ice Shard vs. 0 HP / 0 Def Multiscale Dragonite: 84-102 (26 - 31.5%) -- guaranteed 4HKO'
        );
      });
      describe('Weight', function () {
        describe('Heavy Metal', () => {
          function testBP(ability: string) {
            return calculate(
              Pokemon('Simisage', {ability}),
              Pokemon('Simisear', {ability: 'Heavy Metal'}),
              Move('Grass Knot')
            ).rawDesc.moveBP;
          }
          it('should double the weight of a Pokemon', () => expect(testBP('Gluttony')).toBe(80));
          it('should be negated by Mold Breaker', () => expect(testBP('Mold Breaker')).toBe(60));
        });
        describe('Light Metal', () => {
          function testBP(ability: string) {
            return calculate(
              Pokemon('Simisage', {ability}),
              Pokemon('Registeel', {ability: 'Light Metal'}),
              Move('Grass Knot')
            ).rawDesc.moveBP;
          }
          it('should halve the weight of a Pokemon', () => expect(testBP('Gluttony')).toBe(100));
          it('should be negated by Mold Breaker', () => expect(testBP('Mold Breaker')).toBe(120));
        });
        describe('Float Stone', () => {
          function testBP(ability?: string) {
            return calculate(
              Pokemon('Simisage', {ability: 'Gluttony'}),
              Pokemon('Registeel', {ability, item: 'Float Stone'}),
              Move('Grass Knot')
            ).rawDesc.moveBP;
          }
          it('should halve the weight of a Pokemon', () => expect(testBP()).toBe(100));
          it('should stack with Light Metal', () => expect(testBP('Light Metal')).toBe(80));
        });
      });
    });

    inGen(8, ({gen, Pokemon}) => {
      test(`Pokemon should double their HP stat when dynamaxing (gen ${gen})`, () => {
        const munchlax = Pokemon('Munchlax', {isDynamaxed: true});
        expect(munchlax.curHP()).toBe(822);
      });
    });

    inGens(7, 9, ({gen, calculate, Pokemon, Move, Field}) => {
      test(`Psychic Terrain (gen ${gen})`, () => {
        const field = Field({terrain: 'Psychic'});
        const Mewtwo = Pokemon('Mewtwo', {
          nature: 'Timid',
          evs: {spa: 252},
          boosts: {spa: 2},
        });
        const Milotic = Pokemon('Milotic', {
          item: 'Flame Orb',
          nature: 'Bold',
          ability: 'Marvel Scale',
          evs: {hp: 248, def: 184},
          status: 'brn',
          boosts: {spd: 1},
        });
        const Psystrike = Move('Psystrike');
        const sPunch = Move('Sucker Punch');
        let result = calculate(Mewtwo, Milotic, Psystrike, field);
        if (gen < 8) {
          expect(result.range()).toEqual([331, 391]);
          expect(result.desc()).toBe(
            '+2 252 SpA Mewtwo Psystrike vs. 248 HP / 184+ Def Marvel Scale Milotic in Psychic Terrain: 331-391 (84.2 - 99.4%) -- 37.5% chance to OHKO after burn damage'
          );
        } else {
          expect(result.range()).toEqual([288, 339]);
          expect(result.desc()).toBe(
            '+2 252 SpA Mewtwo Psystrike vs. 248 HP / 184+ Def Marvel Scale Milotic in Psychic Terrain: 288-339 (73.2 - 86.2%) -- guaranteed 2HKO after burn damage'
          );
        }
        result = calculate(Mewtwo, Milotic, sPunch, field);
        expect(result.range()).toEqual([0, 0]);
      });
    });

    inGens(6, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`Parental Bond (gen ${gen})`, () => {
        let result = calculate(
          Pokemon('Kangaskhan-Mega', {evs: {atk: 152}}),
          Pokemon('Amoonguss', {nature: 'Bold', evs: {hp: 252, def: 152}}),
          Move('Frustration')
        );

        if (gen === 6) {
          expect(result.damage).toEqual([
            [153, 154, 156, 157, 159, 162, 163, 165, 166, 168, 171, 172, 174, 175, 177, 180],
            [76, 76, 78, 78, 79, 81, 81, 82, 82, 84, 85, 85, 87, 87, 88, 90],
          ]);
          expect(result.desc()).toBe(
            '152 Atk Parental Bond Kangaskhan-Mega Frustration vs. 252 HP / 152+ Def Amoonguss: 229-270 (53 - 62.5%) -- guaranteed 2HKO'
          );
        } else {
          expect(result.damage).toEqual([
            [153, 154, 156, 157, 159, 162, 163, 165, 166, 168, 171, 172, 174, 175, 177, 180],
            [37, 37, 39, 39, 39, 40, 40, 40, 40, 42, 42, 42, 43, 43, 43, 45],
          ]);
          expect(result.desc()).toBe(
            '152 Atk Parental Bond Kangaskhan-Mega Frustration vs. 252 HP / 152+ Def Amoonguss: 190-225 (43.9 - 52%) -- 6.6% chance to 2HKO'
          );
        }

        result = calculate(
          Pokemon('Kangaskhan-Mega', {level: 88}),
          Pokemon('Amoonguss'),
          Move('Seismic Toss')
        );
        expect(result.damage).toEqual([88, 88]);
        expect(result.desc()).toBe(
          'Lvl 88 Parental Bond Kangaskhan-Mega Seismic Toss vs. 0 HP Amoonguss: 176-176 (47.6 - 47.6%) -- guaranteed 3HKO'
        );

        result = calculate(
          Pokemon('Kangaskhan-Mega', {evs: {atk: 252}}),
          Pokemon('Aggron', {level: 72}),
          Move('Power-Up Punch')
        );
        if (gen === 6) {
          expect(result.desc()).toBe(
            '252 Atk Parental Bond Kangaskhan-Mega Power-Up Punch vs. Lvl 72 0 HP / 0 Def Aggron: 248-296 (120.9 - 144.3%) -- guaranteed OHKO'
          );
        } else {
          expect(result.desc()).toBe(
            '252 Atk Parental Bond Kangaskhan-Mega Power-Up Punch vs. Lvl 72 0 HP / 0 Def Aggron: 196-236 (95.6 - 115.1%) -- 78.9% chance to OHKO'
          );
        }

        if (gen === 6) return;

        result = calculate(
          Pokemon('Kangaskhan-Mega', {evs: {atk: 252}}),
          Pokemon('Lunala'),
          Move('Crunch')
        );

        expect(result.damage).toEqual([
          [188, 190, 192, 194, 196, 198, 202, 204, 206, 208, 210, 212, 214, 216, 218, 222],
          [92, 96, 96, 96, 96, 100, 100, 100, 104, 104, 104, 104, 108, 108, 108, 112],
        ]);
        expect(result.desc()).toBe(
          '252 Atk Parental Bond Kangaskhan-Mega Crunch vs. 0 HP / 0 Def Shadow Shield Lunala: 280-334 (67.4 - 80.4%) -- guaranteed 2HKO'
        );
      });
    });

    inGens(6, 9, ({gen, calculate, Pokemon, Move}) => {
      test('Knock Off vs. Klutz', () => {
        const weavile = Pokemon('Weavile');
        const audino = Pokemon('Audino', {ability: 'Klutz', item: 'Leftovers'});
        const audinoMega = Pokemon('Audino', {ability: 'Klutz', item: 'Audinite'});
        const knockoff = Move('Knock Off');
        const result = calculate(weavile, audino, knockoff);
        expect(result.desc()).toBe(
          '0 Atk Weavile Knock Off (97.5 BP) vs. 0 HP / 0 Def Audino: 139-165 (40 - 47.5%) -- guaranteed 3HKO'
        );
        const result2 = calculate(weavile, audinoMega, knockoff);
        expect(result2.desc()).toBe(
          '0 Atk Weavile Knock Off vs. 0 HP / 0 Def Audino: 93-111 (26.8 - 31.9%) -- guaranteed 4HKO'
        );
      });
    });

    inGens(1, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`Multi-hit percentage kill (gen ${gen})`, () => {
        if (gen < 3) {
          const result = calculate(
            Pokemon('Persian', {boosts: {atk: 4}}),
            Pokemon('Abra'),
            Move('Fury Swipes', {hits: 2}),
          );
          expect(result.range()).toEqual([218, 258]);
          expect(result.desc()).toBe(
            '+4 Persian Fury Swipes (2 hits) vs. Abra: 218-258 (86.1 - 101.9%) -- 2.9% chance to OHKO'
          );
        } else if (gen === 3) {
          const result = calculate(
            Pokemon('Persian', {boosts: {atk: 3}}),
            Pokemon('Abra', {boosts: {def: 1}}),
            Move('Fury Swipes', {hits: 2}),
          );
          expect(result.range()).toEqual([174, 206]);
          expect(result.desc()).toBe(
            '+3 0 Atk Persian Fury Swipes (2 hits) vs. +1 0 HP / 0 Def Abra: 174-206 (91 - 107.8%) -- 41.8% chance to OHKO'
          );
        } else {
          const result = calculate(
            Pokemon('Persian', {boosts: {atk: 3}}),
            Pokemon('Abra', {boosts: {def: 1}}),
            Move('Fury Swipes', {hits: 2}),
          );
          expect(result.range()).toEqual([174, 206]);
          expect(result.desc()).toBe(
            '+3 0 Atk Persian Fury Swipes (2 hits) vs. +1 0 HP / 0 Def Abra: 174-206 (91 - 107.8%) -- 43.8% chance to OHKO'
          );
        }
      });
    });
    inGens(8, 9, ({gen, calculate, Pokemon, Move}) => {
      test('Knock Off vs. Zacian Crowned', () => {
        const weavile = Pokemon('Weavile');
        const zacian = Pokemon('Zacian-Crowned', {ability: 'Intrepid Sword', item: 'Rusted Sword'});
        const knockoff = Move('Knock Off');
        const result = calculate(weavile, zacian, knockoff);
        expect(result.desc()).toBe(
          '0 Atk Weavile Knock Off vs. 0 HP / 0 Def Zacian-Crowned: 36-43 (11 - 13.2%) -- possible 8HKO'
        );
      });
    });

    inGens(5, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`Multi-hit interaction with Multiscale (gen ${gen})`, () => {
        const result = calculate(
          Pokemon('Mamoswine'),
          Pokemon('Dragonite', {
            ability: 'Multiscale',
          }),
          Move('Icicle Spear'),
        );
        expect(result.range()).toEqual([360, 430]);
        expect(result.desc()).toBe(
          '0 Atk Mamoswine Icicle Spear (3 hits) vs. 0 HP / 0 Def Multiscale Dragonite: 360-430 (111.4 - 133.1%) -- guaranteed OHKO'
        );
      });
    });

    inGens(5, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`Multi-hit interaction with Weak Armor (gen ${gen})`, () => {
        let result = calculate(
          Pokemon('Mamoswine'),
          Pokemon('Skarmory', {
            ability: 'Weak Armor',
          }),
          Move('Icicle Spear'),
        );
        expect(result.range()).toEqual([115, 138]);

        result = calculate(
          Pokemon('Mamoswine'),
          Pokemon('Skarmory', {
            ability: 'Weak Armor',
            item: 'White Herb',
          }),
          Move('Icicle Spear'),
        );
        expect(result.range()).toEqual([89, 108]);

        result = calculate(
          Pokemon('Mamoswine'),
          Pokemon('Skarmory', {
            ability: 'Weak Armor',
            item: 'White Herb',
            boosts: {def: 2},
          }),
          Move('Icicle Spear'),
        );
        expect(result.range()).toEqual([56, 69]);

        result = calculate(
          Pokemon('Mamoswine', {
            ability: 'Unaware',
          }),
          Pokemon('Skarmory', {
            ability: 'Weak Armor',
            item: 'White Herb',
            boosts: {def: 2},
          }),
          Move('Icicle Spear'),
        );
        expect(result.range()).toEqual([75, 93]);
      });
    });

    inGens(6, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`Multi-hit interaction with Mummy (gen ${gen})`, () => {
        const result = calculate(
          Pokemon('Pinsir-Mega'),
          Pokemon('Cofagrigus', {
            ability: 'Mummy',
          }),
          Move('Double Hit'),
        );
        if (gen === 6) {
          expect(result.range()).toEqual([96, 113]);
          expect(result.desc()).toBe(
            '0 Atk Aerilate Pinsir-Mega Double Hit (2 hits) vs. 0 HP / 0 Def Mummy Cofagrigus: 96-113 (37.3 - 43.9%) -- guaranteed 3HKO'
          );
        } else {
          expect(result.range()).toEqual([91, 107]);
          expect(result.desc()).toBe(
            '0 Atk Aerilate Pinsir-Mega Double Hit (2 hits) vs. 0 HP / 0 Def Mummy Cofagrigus: 91-107 (35.4 - 41.6%) -- guaranteed 3HKO'
          );
        }
      });
    });

    inGens(7, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`Multi-hit interaction with Items (gen ${gen})`, () => {
        let result = calculate(
          Pokemon('Greninja'),
          Pokemon('Gliscor', {
            item: 'Luminous Moss',
          }),
          Move('Water Shuriken'),
        );
        expect(result.range()).toEqual([104, 126]);
        expect(result.desc()).toBe(
          '0 SpA Greninja Water Shuriken (15 BP) (3 hits) vs. 0 HP / 0 SpD Luminous Moss Gliscor: 104-126 (35.7 - 43.2%) -- guaranteed 3HKO'
        );

        result = calculate(
          Pokemon('Greninja'),
          Pokemon('Gliscor', {
            ability: 'Simple',
            item: 'Luminous Moss',
          }),
          Move('Water Shuriken'),
        );
        expect(result.range()).toEqual([92, 114]);

        result = calculate(
          Pokemon('Greninja'),
          Pokemon('Gliscor', {
            ability: 'Contrary',
            item: 'Luminous Moss',
          }),
          Move('Water Shuriken'),
        );
        expect(result.range()).toEqual([176, 210]);
        expect(result.desc()).toBe(
          '0 SpA Greninja Water Shuriken (15 BP) (3 hits) vs. 0 HP / 0 SpD Luminous Moss Contrary Gliscor: 176-210 (60.4 - 72.1%) -- guaranteed 2HKO'
        );
      });
    });
    // For the EoT tests, 5+ turns is tested separately because it uses the predictTotal instead of computeKOChance, and the code is different for each function
    inGens(3, 9, ({gen, calculate, Pokemon, Move}) => {
      // Mew has 100 Max Health, and Seismic Toss does 25 damage. Leftovers heals 6 HP
      // On turn 5, Mew should be at -1 HP after the Seismic Toss. If Leftovers recovery is applied, the calc will think mew is at 5 HP, and return a 6HKO
      test(`KOed Pokemon don't receive HP recovery after 5+ turns (gen ${gen})`, () => {
        const chansey = Pokemon('Chansey', {
          level: 25,
        });
        const mew = Pokemon('Mew', {
          level: 30,
          item: 'Leftovers',
          ivs: {hp: 0},
        });
        const seismicToss = Move('Seismic Toss');
        const result = calculate(chansey, mew, seismicToss);
        expect(result.damage).toBe(25);
        expect(result.desc()).toBe(
          'Lvl 25 Chansey Seismic Toss vs. Lvl 30 0 HP 0 IVs Mew: 25-25 (25 - 25%) -- guaranteed 5HKO after Leftovers recovery'
        );
      });
    });
    // Similar to the last test, but for the computerKOChance function instead of predictTotal
    inGens(3, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`KOed Pokemon don't receive HP recovery after 1-4 turns (gen ${gen})`, () => {
        const chansey = Pokemon('Chansey', {
          level: 55,
        });
        const mew = Pokemon('Mew', {
          level: 30,
          item: 'Leftovers',
          ivs: {hp: 0},
        });
        const seismicToss = Move('Seismic Toss');
        const result = calculate(chansey, mew, seismicToss);
        expect(result.damage).toBe(55);
        expect(result.desc()).toBe(
          'Lvl 55 Chansey Seismic Toss vs. Lvl 30 0 HP 0 IVs Mew: 55-55 (55 - 55%) -- guaranteed 2HKO after Leftovers recovery'
        );
      });
    });
    inGens(3, 9, ({gen, calculate, Pokemon, Move}) => {
      test(`End of turn damage is calculated correctly after 5+ turns (gen ${gen})`, () => {
        const chansey = Pokemon('Chansey', {
          level: 1,
        });
        const mew = Pokemon('Mew', {
          level: 30,
          status: 'tox',
          toxicCounter: 1,
          ivs: {hp: 0},
        });
        const seismicToss = Move('Seismic Toss');
        const result = calculate(chansey, mew, seismicToss);
        expect(result.damage).toBe(1);
        expect(result.desc()).toBe(
          'Lvl 1 Chansey Seismic Toss vs. Lvl 30 0 HP 0 IVs Mew: 1-1 (1 - 1%) -- guaranteed 6HKO after toxic damage'
        );
      });
    });
    inGens(3, 9, ({gen, calculate, Pokemon, Move, Field}) => {
      test(`End of turn damage is calculated correctly after 1-4 turns (gen ${gen})`, () => {
        const field = Field({
          weather: 'Sand',
          defenderSide: {
            isSeeded: true,
          },
        });
        const chansey = Pokemon('Chansey', {
          level: 1,
        });
        const mew = Pokemon('Mew', {
          level: 30,
          status: 'tox',
          toxicCounter: 1,
          ivs: {hp: 0},
        });
        const seismicToss = Move('Seismic Toss');
        const result = calculate(chansey, mew, seismicToss, field);
        expect(result.damage).toBe(1);
        expect(result.desc()).toBe(
          'Lvl 1 Chansey Seismic Toss vs. Lvl 30 0 HP 0 IVs Mew: 1-1 (1 - 1%) -- guaranteed 4HKO after sandstorm damage, Leech Seed damage, and toxic damage'
        );
      });
    });
    inGens(3, 9, ({gen, calculate, Pokemon, Move, Field}) => {
      test(`End of turn damage is calculated correctly on the first turn (gen ${gen})`, () => {
        const field = Field({
          weather: 'Sand',
        });
        const chansey = Pokemon('Chansey', {
          level: 90,
        });
        const mew = Pokemon('Mew', {
          level: 30,
          status: 'brn',
          ivs: {hp: 0},
        });
        const seismicToss = Move('Seismic Toss');
        const result = calculate(chansey, mew, seismicToss, field);
        expect(result.damage).toBe(90);
        expect(result.desc()).toBe(
          'Lvl 90 Chansey Seismic Toss vs. Lvl 30 0 HP 0 IVs Mew: 90-90 (90 - 90%) -- guaranteed OHKO after sandstorm damage and burn damage'
        );
      });
    });
    inGens(4, 9, ({gen, calculate, Pokemon, Move, Field}) => {
      test(`Mold Breaker does not disable abilities that don't affect direct damage (gen ${gen})`, () => {
        const attacker = Pokemon('Rampardos', {
          ability: 'Mold Breaker',
        });

        const defender = Pokemon('Blastoise', {
          ability: 'Rain Dish',
        });

        const field = Field({
          weather: 'Rain',
        });

        const move = Move('Stone Edge');

        const result = calculate(attacker, defender, move, field);

        expect(result.defender.ability).toBe('Rain Dish');

        expect(result.desc()).toBe(
          '0 Atk Rampardos Stone Edge vs. 0 HP / 0 Def Blastoise: 168-198 (56.1 - 66.2%) -- guaranteed 2HKO after Rain Dish recovery'
        );
      });
    });
    inGens(8, 9, ({gen, calculate, Pokemon, Move, Field}) => {
      test('Steely Spirit should boost Steel-type moves as a field effect.', () => {
        const pokemon = Pokemon('Perrserker', {
          ability: 'Battle Armor',
        });

        const move = Move('Iron Head');

        let result = calculate(pokemon, pokemon, move);

        expect(result.desc()).toBe(
          '0 Atk Perrserker Iron Head vs. 0 HP / 0 Def Perrserker: 46-55 (16.3 - 19.5%) -- possible 6HKO'
        );

        const field = Field({attackerSide: {isSteelySpirit: true}});

        result = calculate(pokemon, pokemon, move, field);

        expect(result.desc()).toBe(
          '0 Atk Perrserker with an ally\'s Steely Spirit Iron Head vs. 0 HP / 0 Def Perrserker: 70-83 (24.9 - 29.5%) -- 99.9% chance to 4HKO'
        );

        pokemon.ability = 'Steely Spirit' as AbilityName;

        result = calculate(pokemon, pokemon, move, field);

        expect(result.desc()).toBe(
          '0 Atk Steely Spirit Perrserker with an ally\'s Steely Spirit Iron Head vs. 0 HP / 0 Def Perrserker: 105-124 (37.3 - 44.1%) -- guaranteed 3HKO'
        );
      });
    });
  });


  describe('Gen 1', () => {
    inGen(1, ({calculate, Pokemon, Move, Field}) => {
      test('Basic: Gengar vs. Chansey', () => {
        const result = calculate(Pokemon('Gengar'), Pokemon('Chansey'), Move('Thunderbolt'));
        expect(result.range()).toEqual([79, 94]);
        expect(result.desc()).toBe(
          'Gengar Thunderbolt vs. Chansey: 79-94 (11.2 - 13.3%) -- possible 8HKO'
        );
      });

      test('Light Screen', () => {
        const field = Field({defenderSide: {isLightScreen: true}});
        const result = calculate(Pokemon('Gengar'), Pokemon('Vulpix'), Move('Surf'), field);
        expect(result.desc()).toBe(
          'Gengar Surf vs. Vulpix through Light Screen: 108-128 (38.7 - 45.8%) -- guaranteed 3HKO'
        );
      });
    });
  });

  describe('Gen 2', () => {
    inGen(2, ({calculate, Pokemon, Move, Field}) => {
      test('Basic: Gengar vs. Chansey', () => {
        const result = calculate(
          Pokemon('Gengar'),
          Pokemon('Chansey', {item: 'Leftovers'}),
          Move('Dynamic Punch')
        );
        expect(result.range()).toEqual([304, 358]);
        expect(result.desc()).toBe(
          'Gengar Dynamic Punch vs. Chansey: 304-358 (43.2 - 50.9%) -- guaranteed 3HKO after Leftovers recovery'
        );
      });

      test('Struggle', () => {
        const attacker = Pokemon('Skarmory', {boosts: {atk: 6, def: 6}});
        const defender = Pokemon('Skarmory', {boosts: {atk: 6, def: 6}});
        const move = Move('Struggle');
        const result = calculate(attacker, defender, move);
        expect(result.range()).toEqual([37, 44]);
        expect(result.desc()).toBe(
          '+6 Skarmory Struggle vs. +6 Skarmory: 37-44 (11.1 - 13.2%) -- possible 8HKO'
        );
      });

      test('Present', () => {
        const attacker = Pokemon('Togepi', {level: 5, boosts: {atk: -6}, status: 'brn'});
        const defender = Pokemon('Umbreon', {boosts: {def: 6}});
        const move = Move('Present');
        const field = Field({defenderSide: {isReflect: true}});
        const result = calculate(attacker, defender, move, field);
        expect(result.range()).toEqual([125, 147]);
        expect(result.desc()).toBe(
          '-6 Lvl 5 burned Togepi Present vs. +6 Umbreon through Reflect: 125-147 (31.8 - 37.4%) -- 89.1% chance to 3HKO'
        );
      });

      test('DVs', () => {
        const aerodactyl = Pokemon('Aerodactyl');
        const zapdos = Pokemon('Zapdos', {ivs: {atk: 29, def: 27}, item: 'Leftovers'});
        expect(zapdos.ivs.hp).toBe(14);

        const move = Move('Ancient Power');
        const result = calculate(aerodactyl, zapdos, move);
        expect(result.range()).toEqual([153, 180]);
        expect(result.desc()).toBe(
          'Aerodactyl Ancient Power vs. Zapdos: 153-180 (41.6 - 49%) -- guaranteed 3HKO after Leftovers recovery'
        );
      });
    });
  });

  describe('Gen 3', () => {
    inGen(3, ({calculate, Pokemon, Move, Field}) => {
      test('Basic: Gengar vs. Chansey', () => {
        const result = calculate(
          Pokemon('Gengar', {
            nature: 'Mild',
            evs: {atk: 100},
          }),
          Pokemon('Chansey', {
            item: 'Leftovers',
            nature: 'Bold',
            evs: {hp: 252, def: 252},
          }),
          Move('Focus Punch')
        );
        expect(result.range()).toEqual([346, 408]);
        expect(result.desc()).toBe(
          '100 Atk Gengar Focus Punch vs. 252 HP / 252+ Def Chansey: 346-408 (49.1 - 57.9%) -- 59% chance to 2HKO after Leftovers recovery'
        );
      });
      test('Water Absorb', () => {
        const cacturne = Pokemon('Cacturne', {
          ability: 'Sand Veil',
        });
        const blastoise = Pokemon('Blastoise', {
          evs: {spa: 252},
        });
        const surf = Move('Surf');

        let result = calculate(blastoise, cacturne, surf);
        expect(result.range()).toEqual([88, 104]);
        expect(result.desc()).toBe(
          '252 SpA Blastoise Surf vs. 0 HP / 0 SpD Cacturne: 88-104 (31.3 - 37%) -- 76.6% chance to 3HKO'
        );

        cacturne.ability = 'Water Absorb' as AbilityName;
        result = calculate(blastoise, cacturne, surf);
        expect(result.damage).toBe(0);
      });

      describe('Spread Moves', () => {
        test('allAdjacent', () => {
          const gengar = Pokemon('Gengar', {nature: 'Mild', evs: {atk: 100}});
          const blissey = Pokemon('Chansey', {
            item: 'Leftovers',
            nature: 'Bold',
            evs: {hp: 252, def: 252},
          });
          const field = Field({gameType: 'Doubles'});
          const result = calculate(gengar, blissey, Move('Explosion'), field);
          expect(result.range()).toEqual([578, 681]);
          expect(result.desc()).toBe(
            '100 Atk Gengar Explosion vs. 252 HP / 252+ Def Chansey: 578-681 (82.1 - 96.7%) -- guaranteed 2HKO after Leftovers recovery'
          );
        });
        test('allAdjacentFoes', () => {
          const gengar = Pokemon('Gengar', {nature: 'Modest', evs: {spa: 252}});
          const blissey = Pokemon('Chansey', {
            item: 'Leftovers',
            nature: 'Bold',
            evs: {hp: 252, def: 252},
          });
          const field = Field({gameType: 'Doubles'});
          const result = calculate(gengar, blissey, Move('Blizzard'), field);
          expect(result.range()).toEqual([69, 82]);
          expect(result.desc()).toBe(
            '252+ SpA Gengar Blizzard vs. 252 HP / 0 SpD Chansey: 69-82 (9.8 - 11.6%)'
          );
        });
      });
    });
  });

  describe('Gen 4', () => {
    inGen(4, ({calculate, Pokemon, Move}) => {
      test('Basic: Gengar vs. Chansey', () => {
        const result = calculate(
          Pokemon('Gengar', {
            item: 'Choice Specs',
            nature: 'Timid',
            evs: {spa: 252},
            boosts: {spa: 1},
          }),
          Pokemon('Chansey', {
            item: 'Leftovers',
            nature: 'Calm',
            evs: {hp: 252, spd: 252},
          }),
          Move('Focus Blast')
        );
        expect(result.range()).toEqual([408, 482]);
        expect(result.desc()).toBe(
          '+1 252 SpA Choice Specs Gengar Focus Blast vs. 252 HP / 252+ SpD Chansey: 408-482 (57.9 - 68.4%) -- guaranteed 2HKO after Leftovers recovery'
        );
      });
      test('Mold Breaker', () => {
        const pinsir = Pokemon('Pinsir', {
          item: 'Choice Band',
          nature: 'Adamant',
          ability: 'Hyper Cutter',
          evs: {atk: 252},
        });
        const gengar = Pokemon('Gengar', {
          item: 'Choice Specs',
          nature: 'Timid',
          evs: {spa: 252},
          boosts: {spa: 1},
        });
        const earthquake = Move('Earthquake');

        let result = calculate(pinsir, gengar, earthquake);
        expect(result.damage).toBe(0);

        pinsir.ability = 'Mold Breaker' as AbilityName;
        result = calculate(pinsir, gengar, earthquake);
        expect(result.range()).toEqual([528, 622]);
        expect(result.desc()).toBe(
          '252+ Atk Choice Band Mold Breaker Pinsir Earthquake vs. 0 HP / 0 Def Gengar: 528-622 (202.2 - 238.3%) -- guaranteed OHKO'
        );

        pinsir.boosts.atk = 2;
        gengar.ability = 'Unaware' as AbilityName;
        result = calculate(pinsir, gengar, earthquake);
        expect(result.range()).toEqual([1054, 1240]);
      });
      test('Technicain boost should happen before boosting items', () => {
        const scizor = Pokemon('Scizor', {
          item: 'Insect Plate',
          ability: 'Technician',
        });
        const chansey = Pokemon('Chansey');
        const bugbite = Move('Bug Bite');
        const result = calculate(scizor, chansey, bugbite);
        expect(result.desc()).toBe(
          '0 Atk Insect Plate Technician Scizor Bug Bite vs. 0 HP / 0 Def Chansey: 745-877 (116.2 - 136.8%) -- guaranteed OHKO'
        );
      });
    });
  });

  describe('Gen 5', () => {
    inGen(5, ({calculate, Pokemon, Move}) => {
      test('Basic: Gengar vs. Chansey', () => {
        const result = calculate(
          Pokemon('Gengar', {
            item: 'Choice Specs',
            nature: 'Timid',
            evs: {spa: 252},
            boosts: {spa: 1},
          }),
          Pokemon('Chansey', {
            item: 'Eviolite',
            nature: 'Calm',
            evs: {hp: 252, spd: 252},
          }),
          Move('Focus Blast')
        );
        expect(result.range()).toEqual([274, 324]);
        expect(result.fullDesc('px')).toBe(
          '+1 252 SpA Choice Specs Gengar Focus Blast vs. 252 HP / 252+ SpD Eviolite Chansey: 274-324 (18 - 22px) -- guaranteed 3HKO'
        );
      });
      test('Technician with Low Kick', () => {
        const ambipom = Pokemon('Ambipom', {level: 50, ability: 'Technician'});
        const blissey = Pokemon('Blissey', {level: 50, evs: {hp: 252}});
        let result = calculate(ambipom, blissey, Move('Low Kick'));
        expect(result.range()).toEqual([272, 320]);
        expect(result.desc()).toBe(
          '0 Atk Technician Ambipom Low Kick (60 BP) vs. 252 HP / 0 Def Blissey: 272-320 (75.1 - 88.3%) -- guaranteed 2HKO'
        );

        const aggron = Pokemon('Aggron', {level: 50, evs: {hp: 252}});
        result = calculate(ambipom, aggron, Move('Low Kick'));
        expect(result.range()).toEqual([112, 132]);
        expect(result.desc()).toBe(
          '0 Atk Ambipom Low Kick (120 BP) vs. 252 HP / 0 Def Aggron: 112-132 (63.2 - 74.5%) -- guaranteed 2HKO'
        );
      });
    });
  });

  describe('Gen 6', () => {
    inGen(6, ({calculate, Pokemon, Move}) => {
      test('Basic: Gengar vs. Chansey', () => {
        const result = calculate(
          Pokemon('Gengar', {
            item: 'Life Orb',
            nature: 'Modest',
            evs: {spa: 252},
          }),
          Pokemon('Chansey', {
            item: 'Eviolite',
            nature: 'Bold',
            evs: {hp: 252, def: 252},
          }),
          Move('Sludge Bomb')
        );
        expect(result.range()).toEqual([134, 160]);
        expect(result.desc()).toBe(
          '252+ SpA Life Orb Gengar Sludge Bomb vs. 252 HP / 0 SpD Eviolite Chansey: 134-160 (19 - 22.7%) -- possible 5HKO'
        );
      });
    });
  });

  describe('Gen 7', () => {
    inGen(7, ({calculate, Pokemon, Move, Field}) => {
      const abomasnow = Pokemon('Abomasnow', {
        item: 'Icy Rock',
        ability: 'Snow Warning',
        nature: 'Hasty',
        evs: {atk: 252, spd: 4, spe: 252},
      });

      const hoopa = Pokemon('Hoopa-Unbound', {
        item: 'Choice Band',
        ability: 'Magician',
        nature: 'Jolly',
        evs: {hp: 32, atk: 224, spe: 252},
      });

      test('Basic: Gengar vs. Chansey', () => {
        const result = calculate(
          Pokemon('Gengar', {
            item: 'Life Orb',
            nature: 'Modest',
            evs: {spa: 252},
            boosts: {spa: 3},
          }),
          Pokemon('Chansey', {
            item: 'Eviolite',
            nature: 'Bold',
            evs: {hp: 100, spd: 100},
            boosts: {spd: 1},
          }),
          Move('Sludge Bomb')
        );
        expect(result.range()).toEqual([204, 242]);
        expect(result.desc()).toBe(
          '+3 252+ SpA Life Orb Gengar Sludge Bomb vs. +1 100 HP / 100 SpD Eviolite Chansey: 204-242 (30.6 - 36.3%) -- 52.9% chance to 3HKO'
        );
      });

      test('Z-Move critical hits', () => {
        const zMove = Move('Wood Hammer', {useZ: true, isCrit: true});
        const result = calculate(abomasnow, hoopa, zMove);
        expect(result.range()).toEqual([555, 654]);
        expect(result.desc()).toBe(
          '252 Atk Abomasnow Bloom Doom (190 BP) vs. 32 HP / 0 Def Hoopa-Unbound on a critical hit: 555-654 (179.6 - 211.6%) -- guaranteed OHKO'
        );
      });

      test('Recoil & Recovery', () => {
        let result = calculate(abomasnow, hoopa, Move('Wood Hammer'));
        expect(result.range()).toEqual([234, 276]);
        expect(result.desc()).toBe(
          '252 Atk Abomasnow Wood Hammer vs. 32 HP / 0 Def Hoopa-Unbound: 234-276 (75.7 - 89.3%) -- guaranteed 2HKO'
        );
        const recoil = result.recoil();
        expect(recoil.recoil).toEqual([24, 28.3]);
        expect(recoil.text).toBe('24 - 28.3% recoil damage');

        result = calculate(hoopa, abomasnow, Move('Drain Punch'));
        expect(result.range()).toEqual([398, 470]);
        expect(result.desc()).toBe(
          '224 Atk Choice Band Hoopa-Unbound Drain Punch vs. 0 HP / 0- Def Abomasnow: 398-470 (123.9 - 146.4%) -- guaranteed OHKO'
        );
        const recovery = result.recovery();
        expect(recovery.recovery).toEqual([161, 161]);
        expect(recovery.text).toBe('52.1 - 52.1% recovered');
      });
      test('Big Root', () => {
        const bigRoot = Pokemon('Blissey', {item: 'Big Root'});
        const result = calculate(bigRoot, abomasnow, Move('Drain Punch'));
        expect(result.range()).toEqual([38, 46]);
        expect(result.recovery().recovery).toEqual([24, 29]);
      });
      test('Loaded Field', () => {
        const field = Field({
          gameType: 'Doubles',
          terrain: 'Grassy',
          weather: 'Hail',
          defenderSide: {
            isSR: true,
            spikes: 1,
            isLightScreen: true,
            isSeeded: true,
            isFriendGuard: true,
          },
          attackerSide: {
            isHelpingHand: true,
            isTailwind: true,
          },
        });
        const result = calculate(abomasnow, hoopa, Move('Blizzard'), field);
        expect(result.range()).toEqual([50, 59]);
        expect(result.desc()).toBe(
          '0 SpA Abomasnow Helping Hand Blizzard vs. 32 HP / 0 SpD Hoopa-Unbound through Light Screen with an ally\'s Friend Guard: 50-59 (16.1 - 19%)' +
            ' -- guaranteed 3HKO after Stealth Rock, 1 layer of Spikes, hail damage, Leech Seed damage, and Grassy Terrain recovery'
        );
      });

      test('Wring Out', () => {
        const smeargle = Pokemon('Smeargle', {level: 50, ability: 'Technician'});
        const blissey = Pokemon('Blissey', {level: 50, evs: {hp: 252}, curHP: 184});
        const result = calculate(smeargle, blissey, Move('Wring Out'));
        expect(result.range()).toEqual([15, 18]);
        expect(result.desc()).toBe(
          '0 SpA Technician Smeargle Wring Out (60 BP) vs. 252 HP / 0 SpD Blissey: 15-18 (4.1 - 4.9%)'
        );
      });

      test('Mold Breaker', () => {
        const pinsir = Pokemon('Pinsir', {
          item: 'Choice Band',
          nature: 'Adamant',
          ability: 'Hyper Cutter',
          evs: {atk: 252},
        });
        const gengar = Pokemon('Gengar', {
          item: 'Choice Specs',
          nature: 'Timid',
          ability: 'Levitate',
          evs: {spa: 252},
          boosts: {spa: 1},
        });
        const earthquake = Move('Earthquake');

        let result = calculate(pinsir, gengar, earthquake);
        expect(result.damage).toBe(0);

        pinsir.ability = 'Mold Breaker' as AbilityName;
        result = calculate(pinsir, gengar, earthquake);
        expect(result.range()).toEqual([528, 622]);
        expect(result.desc()).toBe(
          '252+ Atk Choice Band Mold Breaker Pinsir Earthquake vs. 0 HP / 0 Def Gengar: 528-622 (202.2 - 238.3%) -- guaranteed OHKO'
        );

        pinsir.boosts.atk = 2;
        gengar.ability = 'Unaware' as AbilityName;
        result = calculate(pinsir, gengar, earthquake);
        expect(result.range()).toEqual([1054, 1240]);
      });

      test('16-bit Overflow', () => {
        const result = calculate(
          Pokemon('Mewtwo-Mega-Y', {evs: {spa: 196}}),
          Pokemon('Wynaut', {level: 1, boosts: {spd: -6}}),
          Move('Fire Blast'),
          Field({attackerSide: {isHelpingHand: true}})
        );
        expect(result.damage).toEqual([
          55725, 56380, 57036, 57691,
          58347, 59003, 59658, 60314,
          60969, 61625, 62281, 62936,
          63592, 64247, 64903, 23, // <- overflow: 65559 & 0xFFFF
        ]);
      });

      test('32-bit Overflow', () => {
        let kyogre = Pokemon('Kyogre', {
          ability: 'Water Bubble',
          item: 'Choice Specs',
          curHP: 340, // we need 149 base power Water Spout
          ivs: {spa: 6}, // we need 311 Spa
          boosts: {spa: 6},
        });
        const wynaut = Pokemon('Wynaut', {level: 1, boosts: {spd: -6}});
        const waterSpout = Move('Water Spout');
        const field = Field({weather: 'Rain', attackerSide: {isHelpingHand: true}});

        expect(calculate(kyogre, wynaut, waterSpout, field).range()).toEqual([55, 66]);

        kyogre = Pokemon('Kyogre', {...kyogre, overrides: {types: ['Normal']}});
        expect(calculate(kyogre, wynaut, waterSpout, field).range()).toEqual([37, 44]);
      });
    });
  });

  describe('Gen 8', () => {
    inGen(8, ({calculate, Pokemon, Move, Field}) => {
      test('Basic: Gengar vs. Chansey', () => {
        const result = calculate(
          Pokemon('Gengar', {
            item: 'Life Orb',
            nature: 'Modest',
            evs: {spa: 252},
            boosts: {spa: 3},
          }),
          Pokemon('Chansey', {
            item: 'Eviolite',
            nature: 'Bold',
            evs: {hp: 100, spd: 100},
            boosts: {spd: 1},
          }),
          Move('Sludge Bomb')
        );
        expect(result.range()).toEqual([204, 242]);
        expect(result.desc()).toBe(
          '+3 252+ SpA Life Orb Gengar Sludge Bomb vs. +1 100 HP / 100 SpD Eviolite Chansey: 204-242 (30.6 - 36.3%) -- 52.9% chance to 3HKO'
        );
      });

      test('Knock Off vs. Silvally', () => {
        const sawk = Pokemon('Sawk', {ability: 'Mold Breaker', evs: {atk: 252}});
        const silvally = Pokemon('Silvally-Dark', {item: 'Dark Memory'});
        const knockoff = Move('Knock Off');
        const result = calculate(sawk, silvally, knockoff);
        expect(result.desc()).toBe(
          '252 Atk Sawk Knock Off vs. 0 HP / 0 Def Silvally-Dark: 36-43 (10.8 - 12.9%) -- possible 8HKO'
        );
      });

      test('-ate Abilities', () => {
        const sylveon = Pokemon('Sylveon', {ability: 'Pixilate', evs: {spa: 252}});
        const silvally = Pokemon('Silvally');
        const hypervoice = Move('Hyper Voice');
        const result = calculate(sylveon, silvally, hypervoice);
        expect(result.desc()).toBe(
          '252 SpA Pixilate Sylveon Hyper Voice vs. 0 HP / 0 SpD Silvally: 165-195 (49.8 - 58.9%) -- 99.6% chance to 2HKO'
        );
      });

      test('% chance to OHKO', () => {
        const abomasnow = Pokemon('Abomasnow', {
          level: 55,
          item: 'Choice Specs',
          evs: {spa: 252},
        });
        const deerling = Pokemon('Deerling', {evs: {hp: 36}});
        const blizzard = Move('Blizzard');
        const hail = Field({weather: 'Hail'});
        const result = calculate(abomasnow, deerling, blizzard, hail);
        expect(result.desc()).toBe(
          'Lvl 55 252 SpA Choice Specs Abomasnow Blizzard vs. 36 HP / 0 SpD Deerling: 236-278 (87.4 - 102.9%) -- 25% chance to OHKO (56.3% chance to OHKO after hail damage)'
        );
      });

      test('% chance to OHKO with Leftovers', () => {
        const kyurem = Pokemon('Kyurem', {
          level: 100,
          item: 'Choice Specs',
          evs: {spa: 252},
        });
        const jirachi = Pokemon('Jirachi', {item: 'Leftovers'});
        const earthpower = Move('Earth Power');
        const result = calculate(kyurem, jirachi, earthpower);
        expect(result.desc()).toBe(
          '252 SpA Choice Specs Kyurem Earth Power vs. 0 HP / 0 SpD Jirachi: 294-348 (86.2 - 102%) -- 12.5% chance to OHKO'
        );
      });

      test('Technician with Low Kick', () => {
        const ambipom = Pokemon('Ambipom', {level: 50, ability: 'Technician'});
        const blissey = Pokemon('Blissey', {level: 50, evs: {hp: 252}});
        let result = calculate(ambipom, blissey, Move('Low Kick'));
        expect(result.range()).toEqual([272, 320]);
        expect(result.desc()).toBe(
          '0 Atk Technician Ambipom Low Kick (60 BP) vs. 252 HP / 0 Def Blissey: 272-320 (75.1 - 88.3%) -- guaranteed 2HKO'
        );

        const aggron = Pokemon('Aggron', {level: 50, evs: {hp: 252}});
        result = calculate(ambipom, aggron, Move('Low Kick'));
        expect(result.range()).toEqual([112, 132]);
        expect(result.desc()).toBe(
          '0 Atk Ambipom Low Kick (120 BP) vs. 252 HP / 0 Def Aggron: 112-132 (63.2 - 74.5%) -- guaranteed 2HKO'
        );
      });
    });
  });

  describe('Gen 9', () => {
    inGen(9, ({calculate, Pokemon, Move, Field}) => {
      test('Supreme Overlord', () => {
        const kingambit = Pokemon('Kingambit', {level: 100, ability: 'Supreme Overlord', alliesFainted: 0});
        const aggron = Pokemon('Aggron', {level: 100});
        let result = calculate(kingambit, aggron, Move('Iron Head'));
        expect(result.range()).toEqual([67, 79]);
        expect(result.desc()).toBe(
          '0 Atk Kingambit Iron Head vs. 0 HP / 0 Def Aggron: 67-79 (23.8 - 28.1%) -- 91.2% chance to 4HKO'
        );
        kingambit.alliesFainted = 5;
        result = calculate(kingambit, aggron, Move('Iron Head'));
        expect(result.range()).toEqual([100, 118]);
        expect(result.desc()).toBe(
          '0 Atk Supreme Overlord 5 allies fainted Kingambit Iron Head vs. 0 HP / 0 Def Aggron: 100-118 (35.5 - 41.9%) -- guaranteed 3HKO'
        );
        kingambit.alliesFainted = 10;
        result = calculate(kingambit, aggron, Move('Iron Head'));
        expect(result.range()).toEqual([100, 118]);
        expect(result.desc()).toBe(
          '0 Atk Supreme Overlord 5 allies fainted Kingambit Iron Head vs. 0 HP / 0 Def Aggron: 100-118 (35.5 - 41.9%) -- guaranteed 3HKO'
        );
      });
      test('Electro Drift/Collision Course boost on Super Effective hits', () => {
        const attacker = Pokemon('Arceus'); // same stats in each offense, does not get stab on fighting or electric
        let defender = Pokemon('Mew'); // neutral to both
        const calc = (move = Move('Electro Drift')) => calculate(attacker, defender, move).range();
        // 1x effectiveness should be identical to just using a 100 BP move
        const neutral = calc();
        const fusionBolt = Move('Fusion Bolt');
        expect(calc(fusionBolt)).toEqual(neutral);
        // 2x effectiveness
        defender = Pokemon('Manaphy');
        const se = calc();
        // expect some sort of boost compared to the control
        expect(calc(fusionBolt)).not.toEqual(se);
        // tera should be able to revoke the boost
        defender.teraType = 'Normal';
        expect(calc()).toEqual(neutral);
        // check if secondary type resist is handled
        const cc = Move('Collision Course'); // Fighting type
        defender = Pokemon('Jirachi'); // Steel / Psychic is neutral to fighting, so no boost
        expect(calc(cc)).toEqual(neutral);
        // tera should cause the boost to be applied
        defender.teraType = 'Normal';
        expect(calc(cc)).toEqual(se);
      });
      function testQP(ability: string, field?: {weather?: Weather; terrain?: Terrain}) {
        test(`${ability} should take into account boosted stats by default`, () => {
          const attacker = Pokemon('Iron Leaves', {ability, boostedStat: 'auto', boosts: {spa: 6}});
          // highest stat = defense
          const defender = Pokemon('Iron Treads', {ability, boostedStat: 'auto', boosts: {spd: 6}});

          let result = calculate(attacker, defender, Move('Leaf Storm'), Field(field)).rawDesc;
          expect(result.attackerAbility).toBe(ability);
          expect(result.defenderAbility).toBe(ability);

          result = calculate(attacker, defender, Move('Psyblade'), Field(field)).rawDesc;
          expect(result.attackerAbility).toBeUndefined();
          expect(result.defenderAbility).toBeUndefined();
        });
      }
      function testQPOverride(ability: string, field?: {weather?: Weather; terrain?: Terrain}) {
        test(`${ability} should be able to be overridden with boostedStat`, () => {
          const attacker = Pokemon('Flutter Mane', {ability, boostedStat: 'atk', boosts: {spa: 6}});
          // highest stat = defense
          const defender = Pokemon('Walking Wake', {ability, boostedStat: 'def', boosts: {spd: 6}});

          let result = calculate(attacker, defender, Move('Leaf Storm'), Field(field)).rawDesc;
          expect(result.attackerAbility).toBeUndefined();
          expect(result.defenderAbility).toBeUndefined();

          result = calculate(attacker, defender, Move('Psyblade'), Field(field)).rawDesc;
          expect(result.attackerAbility).toBe(ability);
          expect(result.defenderAbility).toBe(ability);
        });
      }
      testQP('Quark Drive', {terrain: 'Electric'});
      testQP('Protosynthesis', {weather: 'Sun'});
      testQPOverride('Quark Drive', {terrain: 'Electric'});
      testQPOverride('Protosynthesis', {weather: 'Sun'});
      test('Meteor Beam/Electro Shot', () => {
        const defender = Pokemon('Arceus');
        const testCase = (options: {[k: string]: any}, expected: number) => {
          let result = calculate(Pokemon('Archaludon', options), defender, Move('Meteor Beam'));
          expect(result.attacker.boosts.spa).toBe(expected);
          result = calculate(Pokemon('Archaludon', options), defender, Move('Electro Shot'));
          expect(result.attacker.boosts.spa).toBe(expected);
        };
        testCase({}, 1); // raises by 1
        testCase({boosts: {spa: 6}}, 6); // caps at +6
        testCase({ability: 'Simple'}, 2);
        testCase({ability: 'Contrary'}, -1);
      });
      test('Activating Protosynthesis with sun should not affect damage of Poltergeist and Knock Off', () => {
        const attacker = Pokemon('Smeargle');
        const defender = Pokemon('Gouging Fire', {'ability': 'Protosynthesis', 'item': 'Blunder Policy'});
        const field = Field({
          weather: 'Sun',
        });

        const knockOff = calculate(attacker, defender, Move('Knock Off'), field);
        expect(knockOff.rawDesc.moveBP).toBe(97.5);

        const poltergeist = calculate(attacker, defender, Move('Poltergeist'), field);
        expect(poltergeist.move.bp).toBe(110);
      });
      test('Activating Quark Drive with Electric Terrain should not affect damage of Poltergeist and Knock Off', () => {
        const attacker = Pokemon('Smeargle');
        const defender = Pokemon('Iron Valiant', {'ability': 'Quark Drive', 'item': 'Blunder Policy'});
        const field = Field({
          weather: 'Sun',
        });

        const knockOff = calculate(attacker, defender, Move('Knock Off'), field);
        expect(knockOff.rawDesc.moveBP).toBe(97.5);

        const poltergeist = calculate(attacker, defender, Move('Poltergeist'), field);
        expect(poltergeist.move.bp).toBe(110);
      });
      test('Revelation Dance should change type if Pokemon Terastallized', () => {
        const attacker = Pokemon('Oricorio-Pom-Pom');
        const defender = Pokemon('Sandaconda');
        let result = calculate(attacker, defender, Move('Revelation Dance'));
        expect(result.move.type).toBe('Electric');

        attacker.teraType = 'Water';
        result = calculate(attacker, defender, Move('Revelation Dance'));
        expect(result.move.type).toBe('Water');
      });
      test('Psychic Noise should disable healing effects', () => {
        const attacker = Pokemon('Mewtwo');
        const defender = Pokemon('Regigigas', {ability: 'Poison Heal', item: 'Leftovers', status: 'tox'});
        const result = calculate(attacker, defender, Move('Psychic Noise'), Field({terrain: 'Grassy', attackerSide: {isSeeded: true}}));
        expect(result.desc()).toBe('0 SpA Mewtwo Psychic Noise vs. 0 HP / 0 SpD Regigigas: 109-129 (30.1 - 35.7%) -- 31.2% chance to 3HKO');
      });

      test('Flower Gift, Power Spot, Battery, and switching boosts shouldn\'t have double spaces', () => {
        const attacker = Pokemon('Weavile');
        const defender = Pokemon('Vulpix');
        const field = Field({
          weather: 'Sun',
          attackerSide: {
            isFlowerGift: true,
            isPowerSpot: true,
          },
          defenderSide: {
            isSwitching: 'out',
          },
        });
        const result = calculate(attacker, defender, Move('Pursuit'), field);

        expect(result.desc()).toBe(
          "0 Atk Weavile with an ally's Flower Gift Power Spot boosted switching boosted Pursuit (80 BP) vs. 0 HP / 0 Def Vulpix in Sun: 399-469 (183.8 - 216.1%) -- guaranteed OHKO"
        );
      });

      test('Wind Rider should give an Attack boost in Tailwind', () => {
        const attacker = Pokemon('Brambleghast', {'ability': 'Wind Rider'});
        const defender = Pokemon('Brambleghast', {'ability': 'Wind Rider'});
        const field = Field({
          attackerSide: {
            isTailwind: true,
          },
        });

        const result = calculate(attacker, defender, Move('Power Whip'), field);

        expect(attacker.boosts.atk).toBe(0);
        expect(result.attacker.boosts.atk).toBe(1);
      });

      describe('Tera Stellar', () => {
        const terastal = Pokemon('Arceus', {teraType: 'Stellar'});
        const control = Pokemon('Arceus');
        test('should only be displayed on defender for Stellar attacks', () => {
          expect(calculate(control, terastal, Move('Tera Blast'))
            .rawDesc
            .defenderTera).toBeUndefined();
          expect(calculate(terastal, terastal, Move('Tera Blast'))
            .rawDesc
            .defenderTera).toBeDefined();
          // make sure that it isn't caring about stellar first use
          expect(calculate(terastal, terastal, Move('Tera Blast', {isStellarFirstUse: true}))
            .rawDesc
            .defenderTera).toBeDefined();
          expect(calculate(control, terastal, Move('Tera Blast', {isStellarFirstUse: true}))
            .rawDesc
            .defenderTera).toBeUndefined();
        });
        test('should not be displayed for non-boosted attacks', () => expect(
          calculate(terastal, control, Move('Judgment', {isStellarFirstUse: false}))
            .rawDesc
            .attackerTera
        ).toBeUndefined());
        test('should distinguish between first use for Tera Blast', () => {
          // I don't exactly care what the difference is
          const result = [true, false].map((isStellarFirstUse, ..._) =>
            calculate(terastal, control, Move('Tera Blast', {isStellarFirstUse}))
              .rawDesc
              .isStellarFirstUse);
          expect(result[0]).not.toEqual(result[1]);
        });
      });
    });
    describe('Descriptions', () => {
      inGen(9, ({gen, calculate, Pokemon, Move}) => {
        test('displayed chances should not round to 100%', () => {
          const result = calculate(
            Pokemon('Xerneas', {item: 'Choice Band', nature: 'Adamant', evs: {atk: 252}}),
            Pokemon('Necrozma-Dusk-Mane', {nature: 'Impish', evs: {hp: 252, def: 252}}),
            Move('Close Combat')
          );
          expect(result.kochance().chance).toBeGreaterThanOrEqual(0.9995);
          expect(result.kochance().text).toBe('99.9% chance to 3HKO');
        });
        test('displayed chances should not round to 0%', () => {
          const result = calculate(
            Pokemon('Deoxys-Attack', {evs: {spa: 44}}),
            Pokemon('Blissey', {nature: 'Calm', evs: {hp: 252, spd: 252}}),
            Move('Psycho Boost')
          );
          expect(result.kochance().chance).toBeLessThan(0.005); // it would round down.
          expect(result.kochance().text).toBe('0.1% chance to 4HKO');
        });
      });
    });
    describe('Some moves should break screens before doing damage', () => {
      inGens(3, 9, ({calculate, Pokemon, Move, Field}) => {
        test('Brick Break should break screens', () => {
          const pokemon = Pokemon('Mew');

          const brickBreak = Move('Brick Break');
          const otherMove = Move('Vital Throw', {overrides: {basePower: 75}});

          const field = Field({defenderSide: {isReflect: true}});

          const brickBreakResult = calculate(pokemon, pokemon, brickBreak, field);
          expect(brickBreakResult.field.defenderSide.isReflect).toBe(false);

          const otherMoveResult = calculate(pokemon, pokemon, otherMove, field);
          expect(otherMoveResult.field.defenderSide.isReflect).toBe(true);

          expect(brickBreakResult.range()[0]).toBeGreaterThan(otherMoveResult.range()[0]);
          expect(brickBreakResult.range()[1]).toBeGreaterThan(otherMoveResult.range()[1]);
        });
      });
      inGens(7, 9, ({calculate, Pokemon, Move, Field}) => {
        test('Psychic Fangs should break screens', () => {
          const pokemon = Pokemon('Mew');

          const psychicFangs = Move('Psychic Fangs');
          const otherMove = Move('Zen Headbutt', {overrides: {basePower: 75}});

          const field = Field({defenderSide: {isReflect: true}});

          const psychicFangsResult = calculate(pokemon, pokemon, psychicFangs, field);
          expect(psychicFangsResult.field.defenderSide.isReflect).toBe(false);

          const otherMoveResult = calculate(pokemon, pokemon, otherMove, field);
          expect(otherMoveResult.field.defenderSide.isReflect).toBe(true);

          expect(psychicFangsResult.range()[0]).toBeGreaterThan(otherMoveResult.range()[0]);
          expect(psychicFangsResult.range()[1]).toBeGreaterThan(otherMoveResult.range()[1]);
        });
      });
      inGen(9, ({calculate, Pokemon, Move, Field}) => {
        test('Raging Bull should break screens', () => {
          const pokemon = Pokemon('Tauros-Paldea-Aqua');

          const ragingBull = Move('Raging Bull');
          const otherMove = Move('Waterfall', {overrides: {basePower: 90}});

          const field = Field({defenderSide: {isReflect: true}});

          const ragingBullResult = calculate(pokemon, pokemon, ragingBull, field);
          expect(ragingBullResult.field.defenderSide.isReflect).toBe(false);

          const otherMoveResult = calculate(pokemon, pokemon, otherMove, field);
          expect(otherMoveResult.field.defenderSide.isReflect).toBe(true);

          expect(ragingBullResult.range()[0]).toBeGreaterThan(otherMoveResult.range()[0]);
          expect(ragingBullResult.range()[1]).toBeGreaterThan(otherMoveResult.range()[1]);
        });
      });
    });
  });
});
