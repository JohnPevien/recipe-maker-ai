# Recipe Maker AI

A personal cooking assistant that turns the ingredients you have into ranked meal ideas, then adapts the resulting recipes over time. This glossary fixes the vocabulary the product and its code share; it is not a spec.

## Language

### Artifacts

**Recipe**:
A durable cooking artifact with a stable identity that accumulates changes over time.
_Avoid_: Dish, meal, card

**Recipe Revision**:
An immutable snapshot of a Recipe's content at one point in its history.
_Avoid_: Version, edit, save

**Recipe Source**:
How a Recipe entered the app: generated from a Meal Idea, or pasted as text. URL import is deliberately not a source.
_Avoid_: Import, scrape, link

**Generation History**:
The set of Recipes already generated, used to keep new suggestions from repeating. Distinct from a Recipe's own revision history.
_Avoid_: History

### Discover

**Discover**:
The default landing experience where a user enters ingredients and receives ranked Meal Ideas.
_Avoid_: Home, search, explore

**Meal Idea**:
A proposed dish returned by Discover before any full Recipe exists. Temporary by design.
_Avoid_: Suggestion, result, recommendation

**Ingredient Query**:
The temporary set of ingredients entered for a single Discover request.
_Avoid_: Pantry, inventory, stock

**Ranking Preset**:
A named ordering applied to Meal Ideas. Best Match is the default.
_Avoid_: Sort, filter

**Only What I Have**:
The strict Discover setting that forbids any Meal Idea requiring a missing ingredient.
_Avoid_: Strict mode, exact match

### Persistence

**Session History**:
Recipes and conversations that exist only for the current browser session and are discarded when it ends.
_Avoid_: Draft, temp, cache

**Save**:
The explicit user action that promotes a session artifact into durable storage. Not automatic.
_Avoid_: Persist, commit, publish

**Unsaved**:
Describing a Recipe that exists only in Session History.

### Adaptation

**Adaptation**:
A requested change to a Recipe — servings, substitutions, or dietary restrictions — that produces a new Recipe Revision.
_Avoid_: Edit, modify, update

**Approval Diff**:
The structured preview shown before an Adaptation becomes a Recipe Revision. Approved as a whole, never field by field.
_Avoid_: Confirmation, preview

**Restore as New Revision**:
The only path by which an older Recipe Revision re-enters the present: copy it, apply the change, append it as the newest revision. History stays linear.
_Avoid_: Revert, rollback, checkout

### Constraints

**Hard Exclusion**:
A constraint that must never be violated in output — allergies, and dietary patterns when selected.
_Avoid_: Restriction, rule

**Preference**:
A ranking input that may be traded away, such as a disliked ingredient or a preferred cuisine.
_Avoid_: Requirement

**Dietary Pattern**:
A stored eating style such as vegetarian, vegan, or pescatarian. A Hard Exclusion when selected.
_Avoid_: Diet

**Allergy**:
A stored ingredient that must never appear in any output and is never silently overridden.
_Avoid_: Intolerance, dislike
