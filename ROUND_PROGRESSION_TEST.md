# Round Progression Test Guide

## Feature Overview
This branch implements a progressive round system for multiplayer asteroid gameplay:
- **Round 1**: 1 asteroid
- **Round 2**: 2 asteroids (after destroying the first asteroid)
- **Round 3**: 3 asteroids (and so on...)
- **Round 10**: 10 asteroids (final round)
- **Game Complete**: After completing Round 10, the game ends with a victory message

All asteroids are mathematically synchronized between clients using deterministic positioning and improved boundary bouncing to keep them in view.

## Test Setup

### 1. Start the Server
```bash
npm start
```
Server will run on port 6161 (or your configured PORT).

### 2. Open Two Browser Windows
- **Window 1** (Host): `http://localhost:6161`
- **Window 2** (Client): `http://localhost:6161`

You can open both in the same browser or use different browsers.

### 3. Create/Join a Multiplayer Session

#### Window 1 (Host):
1. Click "MULTIPLAYER"
2. Click "CREATE GAME"
3. Note the session ID displayed
4. Click "START GAME"

#### Window 2 (Client):
1. Click "MULTIPLAYER"
2. Enter the session ID from Window 1
3. Click "JOIN"
4. Wait for the host to start the game

## Test Scenarios

### Test 1: Round 1 (Single Asteroid)
**Expected Behavior:**
- Both clients should see **1 asteroid** spawn
- The asteroid should move identically on both clients
- When either player destroys the asteroid, it should disappear on both clients
- After a 2-second delay, Round 2 should begin

**Verification:**
- Check browser console for: `"🌑 HOST: Spawning 1 asteroids for Round 1"`
- Verify asteroid position is synchronized between clients
- Confirm destruction is synchronized

### Test 2: Round 2 (Two Asteroids)
**Expected Behavior:**
- Both clients should see **2 asteroids** spawn simultaneously
- Each asteroid should have a unique ID: `asteroid_r2_0_*` and `asteroid_r2_1_*`
- Both asteroids should move identically on both clients
- Destroying one asteroid should sync to both clients
- Destroying both asteroids should trigger Round 3 after 2 seconds

**Verification:**
- Check browser console for: `"🚀 HOST: Starting Round 2"`
- Check for: `"🌑 HOST: Spawning 2 asteroids for Round 2"`
- Verify both asteroids are synchronized

### Test 3: Round Transition Synchronization
**Expected Behavior:**
- When the host completes a round, the round transition should be broadcast to clients
- Clients should receive the `round-transition` event
- UI should update to show the new round number
- Level message should briefly display

**Verification:**
- Host console: `"🏆 HOST: Round X complete!"`
- Host console: `"🚀 HOST: Starting Round X+1"`
- Client console: `"🚀 CLIENT: Received round transition to Round X+1"`

### Test 4: Host Authority
**Expected Behavior:**
- Only the host should spawn asteroids
- Clients should receive asteroid data via `math-objects-spawn` event
- Clients should create local asteroids with the same mathematical parameters

**Verification:**
- Host console: Multiple `"🌑 HOST: Created asteroid X/Y for Round Z"`
- Host console: `"✅ Asteroid X broadcast acknowledged"`
- Client console: `"🎮 Received mathematical asteroid data"`
- Client console: `"🎮 Creating synchronized asteroid with ID"`

### Test 5: Collision Synchronization
**Expected Behavior:**
- When a player's bullet hits an asteroid:
  - The asteroid is destroyed locally
  - A `math-objects-destroyed` event is broadcast
  - The asteroid is destroyed on all other clients
  - Debris appears on all clients

**Verification:**
- Shooter console: `"Bullet hit asteroid"`
- Server console: `"💥 SERVER: Broadcasting asteroid X destruction"`
- Other client console: `"🎮 Received asteroid X destruction"`

## Known Behaviors

1. **Round always starts at 1**: The first round begins with 1 asteroid (properly initialized on game start)
2. **2-second delay**: There's a 2-second pause between rounds
3. **Asteroids spawn away from center**: Asteroids spawn at least 400 pixels from the center to avoid immediate ship collisions
4. **200ms spawn delay**: When spawning multiple asteroids, there's a 200ms delay between each to prevent position overlap
5. **Asteroids stay in bounds**: Mathematical asteroids use improved boundary bouncing to ensure they remain visible and never drift out of the playable area
6. **10 rounds maximum**: After completing Round 10, the game ends with a victory message displayed to all players
7. **Game completion synchronized**: When the host finishes Round 10, all clients receive the completion message simultaneously

## Debugging Tips

### Enable Debug Mode
Open browser console and check for:
- `🎮` - General game events
- `🌑` - Asteroid spawning
- `🏆` - Round completion
- `🚀` - Round transitions
- `✅` - Successful broadcasts
- `⚠️` - Warnings
- `❌` - Errors

### Common Issues

**Issue**: Asteroids don't spawn
- **Check**: Is the host properly detected? Look for `shouldSpawnAsHost: true`
- **Check**: Are socket events registered? Look for `"Game sync events registered successfully"`

**Issue**: Asteroids not synchronized
- **Check**: Are both clients receiving `math-objects-spawn` events?
- **Check**: Do asteroid IDs match between clients?

**Issue**: Round doesn't progress
- **Check**: Are all asteroids destroyed? Look at `this.asteroids.length`
- **Check**: Is `roundTransitioning` stuck as `true`?

## Test Scenario: Full 10-Round Completion

### Expected Behavior:
1. **Start**: Both clients begin at "Round 1" with 1 asteroid
2. **Progression**: Each round increases asteroid count by 1
3. **Boundaries**: All asteroids bounce within the world bounds and never disappear off-screen
4. **Round 10**: 10 asteroids spawn for the final round
5. **Completion**: After destroying all 10 asteroids, both clients see:
   - Console: `"🎉 All 10 rounds complete! Congratulations!"`
   - UI: Level message displays "Complete!" for 5 seconds
   - Alert: "🎉 Congratulations! You completed all 10 rounds!"

### Verification:
- Host console: `"🎉 HOST: All 10 rounds complete! Game finished!"`
- Host console: `"🎉 HOST: Broadcasting game completion to all clients"`
- Server console: `"🎉 SERVER: Broadcasting game completion (Round 10)"`
- Client console: `"🎉 CLIENT: Received game completion! Final round: 10"`

## Success Criteria

✅ Game always starts at Round 1 (no cache issues)
✅ Round 1 starts with 1 asteroid
✅ Destroying the asteroid triggers Round 2 after 2 seconds
✅ Round 2 spawns 2 asteroids
✅ All asteroids are synchronized between clients
✅ Asteroid destruction is synchronized
✅ Round transitions are synchronized
✅ UI updates show current round number
✅ Asteroids stay within world bounds (improved bouncing)
✅ Round 10 is the final round
✅ Game completion is synchronized to all clients
✅ Victory message displays on all clients

## Next Steps

After successful testing, potential enhancements:
- Add maximum round limit
- Increase asteroid speed per round
- Add score multiplier per round
- Add power-ups between rounds
- Add round summary screen
