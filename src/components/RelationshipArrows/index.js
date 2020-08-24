// @flow

/*

This file turned really ugly. It turns out routing arrows is pretty tricky.

I would advise a rewrite to anyone trying to work with this file. At first I
thought I needed to use a constraint solver, but it turns out that a system of
rules is fine. A lot of the formulas were built by checking numbers against examples
interactively.

*/

import React from "react"

const ARROW_WIDTH = 2
const X_SEP_DIST = 5
const Y_SEP_DIST = 12

export const RelationshipArrows = ({ positions, arrows, rowHeight = 100 }) => {
  const constraintGroups: Array<
    Array<{
      type: "vertical" | "horizontal",
      x?: number,
      y?: number
    }>
  > = []
  for (const arrow of arrows) {
    const { from, to, label } = arrow

    const p1 = positions[from].offset
    const p2 = positions[to].offset

    const sameRow = p1.top === p2.top

    const xDist = p1.left - p2.left

    const rowDelta = Math.round(Math.abs(p1.top - p2.top) / rowHeight)

    if (sameRow) {
      const y = p1.top - Y_SEP_DIST * 1.5
      constraintGroups.push([
        {
          type: "vertical",
          direction: -Math.sign(xDist),
          weight: Math.abs(xDist),
          x: p1.left + p1.width / 2 - X_SEP_DIST * Math.sign(xDist),
          y: p1.top,
          height: rowHeight / 2,
          centerY: (p1.top + y) / 2
        },
        {
          type: "horizontal",
          direction: -1,
          weight: Math.abs(xDist),
          width: Math.abs(p1.left + p1.width / 2 - p2.left - p2.width / 2),
          centerX: (p1.left + p2.left + p1.width / 2 + p2.width / 2) / 2,
          y
        },
        {
          type: "vertical",
          direction: Math.sign(xDist),
          weight: Math.abs(xDist),
          x: p2.left + p2.width / 2 + X_SEP_DIST * Math.sign(xDist),
          y: p2.top,
          height: rowHeight / 2,
          centerY: (p1.top + y) / 2
        }
      ])
    } else if (rowDelta === 1) {
      const y = p1.top + p1.height + Y_SEP_DIST
      constraintGroups.push([
        {
          type: "vertical",
          direction: -Math.sign(xDist),
          weight: Math.abs(xDist),
          x: p1.left + p1.width / 2 - X_SEP_DIST * Math.sign(xDist),
          y: p1.top + p1.height,
          height: rowHeight,
          centerY: (y + p1.top + p1.height) / 2
        },
        {
          type: "horizontal",
          direction: 1,
          weight: Math.abs(xDist),
          width: Math.abs(p1.left + p1.width / 2 - p2.left - p2.width / 2),
          centerX: (p1.left + p2.left + p1.width / 2 + p2.width / 2) / 2,
          y
        },
        {
          type: "vertical",
          direction: Math.sign(xDist),
          weight: Math.abs(xDist),
          x: p2.left + p2.width / 2 + X_SEP_DIST * Math.sign(xDist),
          y: p2.top,
          height: rowHeight,
          centerY: (y + p2.top) / 2
        }
      ])
    } else {
      const y1 = p1.top + p1.height + Y_SEP_DIST
      const y2 = p2.top - Y_SEP_DIST * 1.5
      const x1 = -10
      const xDist1 = p1.left + p1.width / 2 - x1
      const xDist2 = x1 - p2.left + p2.width / 2
      const yDist1 = p1.top + p1.height - p2.top
      const dsign = Math.sign(p2.top - p1.top)
      constraintGroups.push([
        {
          type: "vertical",
          direction: -1,
          weight: Math.abs(xDist1),
          x: p1.left + p1.width / 2 - X_SEP_DIST,
          y: p1.top + p1.height,
          height: rowHeight,
          centerY: y1
        },
        {
          type: "horizontal",
          direction: 1,
          weight: Math.abs(xDist),
          width: Math.abs(p1.left + p1.width / 2 - p2.left - p2.width / 2),
          centerX: (p1.left + x1 + p1.width / 2) / 2,
          y: y1
        },
        {
          type: "vertical",
          direction: -1,
          weight: Math.abs(xDist),
          x: x1,
          height: Math.abs(y1 - y2),
          centerY: (p1.top + p2.top) / 2
        },
        {
          type: "horizontal",
          direction: 1,
          weight: Math.abs(xDist),
          width: Math.abs(p1.left + p1.width / 2 - p2.left - p2.width / 2),
          centerX: (p1.left + x1 + p1.width / 2) / 2,
          y: y2
        },
        {
          type: "vertical",
          direction: -1,
          weight: Math.abs(xDist),
          x: p2.left + p2.width / 2 - X_SEP_DIST,
          y: p2.top,
          height: Math.abs(y1 - y2),
          centerY: (p1.top + p2.top) / 2
        }
      ])
    }
  }
  for (const cg of constraintGroups) {
    for (const constraint of cg) {
      constraint.originalX = constraint.x
      constraint.originalY = constraint.y
    }
  }

  const verticalConstraintLocations = new Set()
  for (const verticalConstraint of constraintGroups.flatMap(cg =>
    cg.filter(c => c.type === "vertical")
  )) {
    verticalConstraintLocations.add(verticalConstraint.x)
  }

  for (const location of verticalConstraintLocations) {
    const constraints = constraintGroups.flatMap(cg =>
      cg.filter(c => c.type === "vertical" && c.x === location)
    )
    // In order of weight, each constraint is placed.
    constraints.sort((a, b) => b.weight - a.weight)
    const placedConstraints = []

    for (const c1 of constraints) {
      const conflicting = []
      for (const c2 of placedConstraints) {
        if (
          Math.abs(c1.centerY - c2.centerY) < c1.height / 2 + c2.height / 2 &&
          c1.x === c2.originalX
        ) {
          conflicting.push(c2)
        }
      }
      if (conflicting.length === 0) {
        placedConstraints.push(c1)
        continue
      } else {
        // Find highest/lowest y of conflicting constraint
        const highestVal = Math[c1.direction === 1 ? "max" : "min"](
          ...conflicting.map(c => c.x)
        )
        c1.x = highestVal + X_SEP_DIST * c1.direction
        placedConstraints.push(c1)
      }
    }
  }

  const horzConstraintLocations = new Set()
  for (const horzConstraint of constraintGroups.flatMap(cg =>
    cg.filter(c => c.type === "horizontal")
  )) {
    horzConstraintLocations.add(horzConstraint.x)
  }

  for (const location of horzConstraintLocations) {
    const constraints = constraintGroups.flatMap(cg =>
      cg.filter(c => c.type === "horizontal" && c.x === location)
    )
    // In order of weight, each constraint is placed.
    constraints.sort((a, b) => a.weight - b.weight)
    const placedConstraints = []

    for (const c1 of constraints) {
      const conflicting = []
      for (const c2 of placedConstraints) {
        if (
          Math.abs(c1.centerX - c2.centerX) < c1.width / 2 + c2.width / 2 &&
          c1.y === c2.originalY
        ) {
          conflicting.push(c2)
        }
      }
      if (conflicting.length === 0) {
        placedConstraints.push(c1)
        continue
      } else {
        // Find highest/lowest y of conflicting constraint
        const highestVal = Math[c1.direction === 1 ? "max" : "min"](
          ...conflicting.map(c => c.y)
        )
        c1.y = highestVal + Y_SEP_DIST * c1.direction
        placedConstraints.push(c1)
      }
    }
  }

  // Convert lines to points
  const linePoints: Array<Array<[number, number]>> = []
  for (const constraints of constraintGroups) {
    let lastPoint: [number, number] = [
      constraints[0].x || 0,
      constraints[0].y || 0
    ]
    const points = [lastPoint]
    for (const constraint of constraints.slice(1, -1)) {
      lastPoint = [
        constraint.x === undefined ? lastPoint[0] : constraint.x,
        constraint.y === undefined ? lastPoint[1] : constraint.y
      ]
      points.push(lastPoint)
    }
    const lastConstraint = constraints[constraints.length - 1]
    if (lastConstraint.type === "vertical") {
      points.push(
        [lastConstraint.x, lastPoint[1]],
        [lastConstraint.x, lastConstraint.y]
      )
    } else {
      throw new Error("Didn't build support for horizontal final (not needed)")
    }
    linePoints.push(points)
  }

  const svgOffset = { x: 100, y: 100 }

  return (
    <svg width="600" height="600">
      <defs>
        {arrows.map((arrow, i) => (
          <marker
            id={"arrowhead" + i}
            markerWidth="5"
            markerHeight="5"
            refX="0"
            refY="2.5"
            orient="auto"
          >
            <polygon fill={arrow.color || "#000"} points="0 0, 6 2.5, 0 5" />
          </marker>
        ))}
      </defs>
      {linePoints.map((lp, i) => (
        <polyline
          key={i}
          stroke={arrows[i].color || "#000"}
          fill="none"
          marker-end={`url(#arrowhead${i})`}
          stroke-width="2"
          points={lp
            .map(
              ([x, y], i) =>
                `${svgOffset.x + x},${svgOffset.y +
                  y -
                  (i === lp.length - 1 ? 10 : 0)}`
            )
            .join(" ")}
        />
      ))}
      {Object.values(positions).map(p => (
        <rect
          x={p.offset.left + svgOffset.x}
          y={p.offset.top + svgOffset.y}
          width={p.offset.width}
          height={p.offset.height}
          fill="rgba(0,0,0,0.5)"
        />
      ))}
    </svg>
  )
}

export default RelationshipArrows
