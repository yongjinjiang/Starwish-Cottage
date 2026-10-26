import { useI18n } from "../lib/i18n";
export function CottageIllustration() {
  const { t } = useI18n();
  return (
    <svg
      className="cottage-illustration"
      viewBox="0 0 590 470"
      role="img"
      aria-label={t("星空下，一间亮着暖灯的小屋，花园里收藏着家人的心愿")}
    >
      <defs>
        <radialGradient id="glow">
          <stop stopColor="#f7dfa4" stopOpacity=".7" />
          <stop offset="1" stopColor="#f7dfa4" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sky" x2="1" y2="1">
          <stop stopColor="#e7e8d9" />
          <stop offset="1" stopColor="#f2e5d1" />
        </linearGradient>
        <pattern id="roof" width="24" height="13" patternUnits="userSpaceOnUse">
          <path
            d="M0 12h24M12 0v12"
            stroke="#485b50"
            strokeWidth="1"
            fill="none"
          />
        </pattern>
      </defs>
      <path
        d="M66 348C14 258 45 104 159 67c117-39 230-24 295 61 65 85 46 181-19 230z"
        fill="url(#sky)"
      />
      <circle cx="397" cy="112" r="32" fill="#f9efce" />
      <path d="M409 81a32 32 0 0 0 15 54 32 32 0 1 1-15-54" fill="#f7d893" />
      <g fill="#ab874c">
        <path d="m146 99 3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
        <path d="m334 61 2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
        <path d="m462 194 3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
      </g>
      <g fill="#b3bda7">
        <circle cx="109" cy="185" r="3" />
        <circle cx="288" cy="88" r="3" />
        <circle cx="435" cy="258" r="3" />
        <circle cx="202" cy="63" r="2" />
        <circle cx="483" cy="143" r="2" />
      </g>
      <ellipse cx="294" cy="377" rx="220" ry="38" fill="#d9dec8" />
      <path
        d="M137 342c-10-58-1-94 21-121-2 60 15 56 16 116M110 348c-20-30-24-55-16-82 28 26 36 46 32 75M449 349c-4-59 7-83 27-108 4 49-2 80-15 105"
        fill="#8c9d82"
      />
      <rect
        x="198"
        y="240"
        width="195"
        height="128"
        rx="5"
        fill="#f3dfb8"
        stroke="#a99470"
        strokeWidth="2"
      />
      <path
        d="M174 248 290 133 412 248z"
        fill="#5e7263"
        stroke="#3b5247"
        strokeWidth="3"
      />
      <path d="M185 240 290 145 401 240z" fill="url(#roof)" opacity=".8" />
      <path
        d="M344 174v-48h28v75"
        fill="#c7af8d"
        stroke="#a58d6d"
        strokeWidth="2"
      />
      <path
        d="M338 126h40"
        stroke="#a58d6d"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M351 106c-15-16 14-19 4-35"
        stroke="#b7bfb0"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
        opacity=".6"
      />
      <circle
        cx="292"
        cy="207"
        r="19"
        fill="#f8df9e"
        stroke="#e6cf9b"
        strokeWidth="6"
      />
      <path d="M292 188v38m-19-19h38" stroke="#8c997b" strokeWidth="3" />
      <circle cx="292" cy="306" r="91" fill="url(#glow)" />
      <path
        d="M271 368v-65a23 23 0 0 1 46 0v65"
        fill="#526e5a"
        stroke="#3a5346"
        strokeWidth="2"
      />
      <path d="M279 310v-7a15 15 0 0 1 30 0v7z" fill="#f7db91" />
      <circle cx="305" cy="336" r="3" fill="#e6c57b" />
      <g fill="#f5d583" stroke="#8e9b7b" strokeWidth="5">
        <rect x="216" y="277" width="33" height="39" rx="3" />
        <rect x="339" y="277" width="33" height="39" rx="3" />
      </g>
      <path
        d="M232 278v37m123-37v37M217 297h31m92 0h31"
        stroke="#8e9b7b"
        strokeWidth="3"
      />
      <path
        d="M275 369c-6 17-14 25-35 40h98c-17-13-28-27-30-40"
        fill="#e9d6b4"
      />
      <g stroke="#758b70" strokeWidth="3" fill="none">
        <path d="M171 373v-53m-1 33-15-16m16 4 14-17M412 374v-48m0 29-12-12m12 2 14-15M129 370v-26" />
      </g>
      <g fill="#d6a299">
        <circle cx="170" cy="315" r="9" />
        <circle cx="155" cy="333" r="7" />
        <circle cx="186" cy="320" r="7" />
      </g>
      <g fill="#c8ae68">
        <circle cx="411" cy="320" r="8" />
        <circle cx="428" cy="327" r="7" />
        <circle cx="129" cy="340" r="7" />
      </g>
      <g stroke="#8c9d82" strokeWidth="2" fill="none">
        <path d="M72 389c31-14 58-9 79 1m274 3c26-14 47-12 69-5" />
      </g>
      <path
        d="m216 134-15-9m-5 19-15-2m51-26-6-15"
        stroke="#bfa264"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g transform="translate(405 288) rotate(12)">
        <rect width="49" height="35" rx="3" fill="#fbf5e8" stroke="#bdac8c" />
        <path d="m1 2 23 18L48 2" fill="none" stroke="#bdac8c" />
        <path d="m22 19 3-3 3 3-3 4z" fill="#bd8585" />
      </g>
    </svg>
  );
}
