# Ultrared Light Therapy: Suite 220, Acacia Court (3D walkthrough plan)

**Layout source:** traced from the Suite 220 floor-plan image. The PNG never reached the box, so the
pixel measurements were read off the image and sent over. Scale is 14.3 px = 1 ft, and the origin is the
suite's top-left corner at image px (100, 175). North is the top of the image. Coordinates below are in feet:
x runs west to east (0 to 56) and z runs north to south (0 to 49.3). The suite's bounding box is about 56 × 49 ft
with the terrace notch cut out, roughly 2,423 sq ft. The wall table is in `js/plan.js`.
v1, which was estimated from a text description, is kept in `tools/plan_v1_estimated.js`.

Ceiling height is 9 ft. Doors are 2.8 to 3 ft wide by 7 ft tall, and the entry is a 3.1 ft double door.
Window sills are at 3 ft and window heads at 7.5 ft. Interior walls are 0.4 ft thick and exterior walls are 0.75 ft.

| Plan room | Image px | Feet (x, z) | ≈ sq ft | Theme | Photos |
|---|---|---|---|---|---|
| Conference Room | x105–315, y180–480 | 0–15.2, 0–21.3 | 320 | Consult | office_01, lounge_10, lounge_08 |
| Kitchen / Copy | x105–235, y485–615 | 0–9.4, 21.3–30.8 | 89 | Kitchen | kitchen_01 |
| Reception | x105–335, y615–880 | 0–16.4, 30.8–49.3 | 303 | **Reception** | reception_01–06 |
| Curved corridor | east of the kitchen | 9.4–15.2, 21.3–30.8 | 57 | Hall | hall_01 |
| Closet | x315–410, y540–665 | 15.2–21.7, 25.5–35 | 60 | none | none |
| Open Area | x320–635, y180–450 | 15.2–37.4, 0–19.2 | 422 | **Lounge** | lounge_01–08 |
| Open Area 2 (column at px 605,480 → 35.3, 21.3) | x320–700, y450–670 | 15.2–42, 19.2–35 | ≈360 (net of the closet) | **Lounge 2 / gallery** | lounge_09, 11, 12 |
| Door cluster | around px 720,680 | 42–46.5, 31–35 | 18 | Hall | hall_02 |
| Office upper right | x705–895, y460–670 | 42–56, 19.5–35 (less the cluster notch) | 199 | **AIR** (patio-facing) | air_01–04 |
| Office bottom left | x340–525, y675–875 | 16.4–29.9, 35–49.3 | 193 | **EARTH** | earth_01–05 |
| Office bottom center | x530–715, y680–875 | 29.9–43.2, 35–49.3 | 190 | **WATER** | water_01–06 |
| Office bottom right | x720–895, y680–880 | 43.2–56, 35–49.3 | 183 | **FIRE** | fire_01–06 |
| Terrace #3 (outdoor) | x635–905, y180–450 | 37.4–56, 0–19.5 | ≈360 (outdoor, not rentable) | none | none |

Net room area comes to about 2,394 sq ft. Wall thickness accounts for the rest of the roughly 2,423 sq ft rentable.

## Doors
- **Main entry:** double door on the south wall, x6.3–9.4 (px 190–235).
- **Conference to corridor:** door at the bottom-right of the conference room (px 285,455), x11.5–14.3 on z21.3.
- **Kitchen to Reception:** open at the bottom of the kitchen, x2.8–7.0 (px 140–200).
- **Corridor to Open Area 2:** door at px (330,500), on x15.2 at z21.6–24.6.
- **Closet:** door at px (365,545), x17–20 on z25.5, opening into Open Area 2.
- **Open Area to Terrace #3:** glass door at px (655,380), on x37.4 at z12.8–15.8.
- **Office cluster:**
  - Bottom-left (Earth): x26–28.8 on z35.
  - Bottom-center (Water): x39.3–42 on z35.
  - Bottom-right (Fire): x43.6–46.4 on z35.
  - Upper-right (Air): x46.5 at z31.6–34.4, off a small door-cluster pocket.
- **Open flow:** Open Area runs straight into Open Area 2, and the corridor runs straight into Reception.

## Curved wall
A convex arc runs from px (300,580) to (335,700), which is (15.2, 25.5) to (16.4, 36.7), bulging east.
It then runs straight down x16.4 to the south wall. It separates Reception and the corridor from the closet and the offices.

## Windows
- **North wall:** x0.6–14.6 (Conference) and x15.8–36.9 (Open Area). The plan shows windows along px 105–630.
- **West wall:** Conference (z2–19) and Reception (z33–47).
- **East wall (px 900, y460–880):** upper-right office (z21–33.5) and bottom-right office (z36.5–48).
- **Terrace-facing walls:** I modeled these as glass (the Open Area side) and windows (the Air office). The plan
  doesn't detail them, so this is my assumption.
- **South wall:** entry only, no windows.

## Why the themes go where they do
The storyboard's Air room is the "patio-facing treatment room", so it takes the upper-right office beside the terrace.
Fire, Water and Earth take the bottom-right, bottom-center and bottom-left offices around the door cluster.
The Lounge theme goes in the two open areas.

## Still approximate
- Exact door widths and swing directions.
- The radius of the curved wall.
- The window extents on the west wall and the terrace-facing walls.
- Furniture is procedural and placed by eye.

## Guided tour and deep links
Tour order: Reception, Corridor, Conference, Kitchen, Lounge, Terrace, Gallery Lounge, Air, Fire, Water, Earth.
Deep links: `?stop=<roomId>&instant&light=0..2` and `?view=overview`.
