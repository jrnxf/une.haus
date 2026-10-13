// iOS shows a home screen app's startup picture only when one is declared for
// the exact screen it runs on, and a blank page otherwise. This table is the
// single source for both the pictures drawn at build time
// (build/startup-images-plugin.ts) and the links in the document head
// (src/routes/__root.tsx), so the two cannot drift apart.

export type StartupTheme = "light" | "dark"

/** The page background of each theme, which the picture is filled with. */
export const STARTUP_PAPER: Record<StartupTheme, string> = {
  light: "#ffffff",
  dark: "#000000",
}

/** The wordmark in `public/icons` that reads on each theme's paper. */
export const STARTUP_LOGO: Record<StartupTheme, string> = {
  light: "logo-full-black.svg",
  dark: "logo-full-white.svg",
}

/** How wide the wordmark is drawn, in the CSS pixels the screens are measured in. */
export const STARTUP_LOGO_WIDTH = 200

type Screen = {
  /** Upright width and height in CSS pixels, as a page reports them. */
  width: number
  height: number
  /** Real pixels per CSS pixel. */
  ratio: number
  /** Whether the device also gets pictures for its side. Phones only run upright. */
  landscape: boolean
}

const phone = (width: number, height: number, ratio: number): Screen => ({
  width,
  height,
  ratio,
  landscape: false,
})
const tablet = (width: number, height: number, ratio: number): Screen => ({
  width,
  height,
  ratio,
  landscape: true,
})

const SCREENS: Screen[] = [
  // iPhone
  phone(375, 667, 2), // 8, SE (2nd and 3rd)
  phone(414, 736, 3), // 8 Plus
  phone(375, 812, 3), // X, XS, 11 Pro, 12 mini, 13 mini
  phone(414, 896, 2), // XR, 11
  phone(414, 896, 3), // XS Max, 11 Pro Max
  phone(390, 844, 3), // 12, 12 Pro, 13, 13 Pro, 14, 16e
  phone(428, 926, 3), // 12 Pro Max, 13 Pro Max, 14 Plus
  phone(393, 852, 3), // 14 Pro, 15, 15 Pro, 16
  phone(430, 932, 3), // 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  phone(402, 874, 3), // 16 Pro, 17 Pro
  phone(440, 956, 3), // 16 Pro Max, 17 Pro Max
  phone(420, 912, 3), // Air
  // iPhone with Display Zoom set to larger text, which reports a smaller screen
  phone(320, 568, 2), // 8, SE (2nd and 3rd)
  phone(375, 667, 3), // 8 Plus
  phone(320, 693, 3), // X to 16, the 5.4 to 6.1 inch ones
  phone(375, 812, 2), // XR, 11
  // iPad
  tablet(768, 1024, 2), // iPad (5th and 6th), mini (5th)
  tablet(744, 1133, 2), // mini (6th)
  tablet(810, 1080, 2), // iPad (7th to 9th)
  tablet(820, 1180, 2), // iPad (10th), Air (4th, 5th), Air 11-inch
  tablet(834, 1112, 2), // Air (3rd), Pro 10.5-inch
  tablet(834, 1194, 2), // Pro 11-inch (1st to 4th)
  tablet(834, 1210, 2), // Pro 11-inch (M4, M5)
  tablet(1024, 1366, 2), // Pro 12.9-inch, Air 13-inch
  tablet(1032, 1376, 2), // Pro 13-inch (M4, M5)
]

export type StartupPicture = {
  /** Path under the site root the page links to and the build writes to. */
  file: string
  theme: StartupTheme
  /** The media query selecting the screen, its way up and the theme. */
  media: string
  /** Size in real pixels. */
  width: number
  height: number
  /** Real pixels per CSS pixel, so the logo keeps its size across screens. */
  ratio: number
}

export const STARTUP_PICTURES: StartupPicture[] = (
  ["light", "dark"] as const
).flatMap((theme) =>
  SCREENS.flatMap(({ width, height, ratio, landscape }) => {
    // A screen on its side still reports its upright width and height.
    const screen = `(prefers-color-scheme: ${theme}) and (device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${ratio})`
    const upright: StartupPicture = {
      file: `startup/${theme}-${width}x${height}-${ratio}x.png`,
      theme,
      media: `${screen} and (orientation: portrait)`,
      width: width * ratio,
      height: height * ratio,
      ratio,
    }
    if (!landscape) return [upright]
    return [
      upright,
      {
        file: `startup/${theme}-${height}x${width}-${ratio}x.png`,
        theme,
        media: `${screen} and (orientation: landscape)`,
        width: height * ratio,
        height: width * ratio,
        ratio,
      },
    ]
  }),
)

export const STARTUP_LINKS = STARTUP_PICTURES.map(({ file, media }) => ({
  rel: "apple-touch-startup-image",
  media,
  href: `/${file}`,
}))
