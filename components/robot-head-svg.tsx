export function RobotHeadSVG() {
  return (
    <svg viewBox="0 0 152 142" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Neck */}
      <path d="M56 132H96L101 142H51L56 132Z" fill="#F39C12" />
      {/* Main Head Shape (Orange) */}
      <path
        d="M136.5 56.0001C147.5 83.5001 142.5 122.5 121.5 132H30.5C9.5 122.5 -5.5 83.5001 5.5 56.0001C16.5 28.5001 46 -4.99994 76 -4.99994C106 -4.99994 125.5 28.5001 136.5 56.0001Z"
        fill="#F39C12"
      />
      {/* Helmet (Dark Grey) */}
      <path
        d="M118 31C124 49.5 122.5 81.5 118 98.5V126H34V98.5C29.5 81.5 28 49.5 34 31C40 12.5 58.5 6.5 76 6.5C93.5 6.5 112 12.5 118 31Z"
        fill="#2C3E50"
      />
      {/* Visor (Black) - The eyes will be placed over this */}
      <path
        d="M108 64C111.5 77.5 111 98.5 108 109H44C41 98.5 40.5 77.5 44 64C47.5 50.5 60 46 76 46C92 46 104.5 50.5 108 64Z"
        fill="#000000"
      />
      {/* Antennas */}
      <path d="M34 31L24 16L36 22L34 31Z" fill="#F39C12" />
      <path d="M24 16L18 22L30 28L24 16Z" fill="#2C3E50" />
      <path d="M118 31L128 16L116 22L118 31Z" fill="#F39C12" />
      <path d="M128 16L134 22L122 28L128 16Z" fill="#2C3E50" />
    </svg>
  )
}
