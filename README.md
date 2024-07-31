<h1 align="center">
  <img alt="showdex-lib" width="360px" src=".github/showdex-lib.png">
  <br>
  <code>showdex-calc</code>
</h1>

<table align="center">
  <thead>
    <tr>
      <th align="center">&nbsp;Showdex <a href="https://github.com/doshidak/showdex/releases/tag/v1.2.4">v1.2.4</a>&nbsp;</th>
      <th align="center">&nbsp;Patched <a href="https://npmjs.com/package/@smogon/calc/v/0.10.0">v0.10.0</a> @ <a href="https://github.com/smogon/damage-calc/commit/98b687c9304762fc4d16842db778bd5a16877927"><code>98b687c</code></a>&nbsp;</th>
    </tr>
  </thead>
</table>

<br>

[**Showdex**](https://github.com/doshidak/showdex)'s fork of the [**`@smogon/calc`**](https://github.com/smogon/damage-calc) package, sometimes referred to as the "underlying damage calculator." This is the modified source of the aforementioned package that's patched in & bundled with official releases of Showdex.

If you're looking for Showdex's source code, this **isn't** it ([try here](https://github.com/doshidak/showdex) instead!). You're looking at a supporting package that supplies all the damage calculations that Showdex displays to you. But if you're looking for a sign, here's a pointer: `int*` <sub>✧ﾟ･: *ヽ(◕ヮ◕ヽ)</sub>

<br>
<br>

<h1 align="center">
  Developer Zone
</h1>

> [!CAUTION]
> You are about to get in the zone, the developer zone.  
> If you do not wish to get in the zone, the developer zone, please visit [this zone](https://youtube.com/watch?v=9MiP1MJC7EU) instead.

## Developer SparkNotes™

Sooo... what's different?

**Mainly:**

* Disabled web client.
  - Web client build scripts have been bypassed in the `postinstall` script.
  - For our purposes, we're only interested in the *ＭＥＡＴ* inside the [`calc`](/calc) directory ( ͡° ͜ʖ ͡°)
* `yarn` Classic in lieu of `npm`, similar to Showdex.

**More specifically:**

* Hacky [*Beat Up*](https://smogon.com/dex/sv/moves/beat-up) implementation requiring [`getBaseDamage()`'s to be subbed for this fork's special `modBaseDamage()` wrapper](/calc/src/mechanics/gen3.ts#L157-L158) instead.
  - Since this requires [knowledge about all party Pokémon](https://bulbapedia.bulbagarden.net/wiki/Beat_Up_(move)#Effect), Showdex passes a special [`ShowdexCalcMods`](/calc/src/showdex.ts#L67) object to [`modBaseDamage()`](/calc/src/showdex.ts#L106), which is a generic wrapper (to support more mods in the future, as needed) that basically only contains a `strikes[]` array for *Beat Up* & `hitBasePowers[]` for overriding each hit's BP.
  - Every single mechanics file from [`gen12.ts`](/calc/src/mechanics/gen12.ts#L205) to [`gen789.ts`](/calc/src/mechanics/gen789.ts#L1611) has this modification.
* Disabled auto-BP calculations for some moves like [*Triple Kick*](/calc/src/mechanics/gen789.ts#L943-L947) (but not all!) so that what you see (in the Calcdex &mdash; especially when editing moves) is what you *calc*.
* Disabled auto-boosting of some abilities like [*Intrepid Sword*](/calc/src/util.ts#L250-L257), especially since Showdown *also* reports those boosts in the battle!
* [Persistent final move BPs in matchup descriptions](/calc/src/mechanics/gen789.ts#L990) to assist with debugging calculations from Showdex.
* Extra exported types in [`src/index.ts`](/calc/src/index.ts#L147-L170) that I frequently use like `GameType` & `GenerationNum`, conveniently importable from `'@smogon/calc'` directly.

Many of these modifications were made to account for real-time battle conditions that don't apply to the original web-based version. Hence, I'm not intending on pushing any of them to the master [`@smogon/calc`](https://github.com/smogon/damage-calc/tree/master/calc) repo (also would seriously break the good 'ol [Damage Calculator](https://calc.pokemonshowdown.com) we know & love!).

### Requirements

* **`node`** LTS Hydrogen v18
* **`yarn`** Classic v1.22.0+
* **`bash`** ([Windows WSL](https://docs.microsoft.com/en-us/windows/wsl/install), macOS, or Linux)

## ①&nbsp;&nbsp;Installation

> [!CAUTION]
> Without any additional package configuration (that I'm too lazy to do rn), attempting to install this from a package manager (e.g., `yarn add doshidak/showdex-calc`) will fail! You **must** install this custom fork into your local copy of Showdex using the cumbersome method detailed below. Sorry :c

> [!IMPORTANT]
> I'm assuming you've already cloned `doshidak/showdex.git` (i.e., Showdex's source code), which exists under `showdex` in your favorite directory.

1. `cd` into your favorite directory.
2. `git clone git@github.com:doshidak/showdex-calc.git`
3. `cd showdex-calc`
4. `yarn`
5. `cd ../showdex`
6. `rm -r node_modules/@smogon/calc/dist node_modules/@smogon/calc/src`
7. `cp -r ../showdex-calc/calc/dist ../showdex-calc/calc/src node_modules/@smogon/calc`
8. `yarn patch-package @smogon/calc`
9. `yarn`
10. `yarn dev:re`
11. ???
12. Profit!

> [!TIP]
> Creating the Patchfile in step 8 is completely optional if you just want to quickly test some changes.

> [!INFO]
> Technically, copying the `showdex-calc/calc/dist/src` directory into `node_modules/@smogon/calc` has no effect (uses the files in `dist` instead) & is completely optional, but I do it anyway so you can peep the source code. Fun fact: You can look through your local Showdex's `node_modules/@smogon/calc/src` right now to see the source code you see here!

> [!TIP]
> Showdex's `yarn dev[:chrome|:firefox]:re` script is an alias of its `yarn cache:purge && yarn dev[:chrome|:firefox]` scripts (also `yarn dev` itself is an alias of `yarn dev:chrome`). Running `yarn cache:purge` is necessary if you've changed anything inside `node_modules` (including the `@smogon/calc` package!) after running `yarn dev` since the stale changes will still persist in (& be loaded from) `node_modules/.cache/babel`.

**wait, you mean you do this *every* time for *every* Showdex release ???**

* yessir
* all natty
  - no git
  - no ci
  - raw dawg
* basically took a year to set this up cause I'm lazy
  - probably would've taken at least two had someone not asked me for this LOL

<br>

<h1 align="center">
  Credits
</h1>

big thank to:

* honk honk
* austin, tx
* kris kringle
* smog squad
* `git clone`

yee

\ (•◡•) /
