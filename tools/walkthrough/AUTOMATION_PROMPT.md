# Automation prompt: generate the 4 Rivers walkthrough video

Paste everything below the line into an agentic LLM that has a shell and a browser
(Claude Code, or any agent with the same tools). Plain Gemini chat can't drive the
app or encode video; give it only the storyboard in `storyboard.json` for scripting
or Veo b-roll.

---

You are producing a walkthrough video for 4 Rivers (https://four-rivers.vercel.app),
a free, scripture-based stewardship course for young adults.

HARD LIMITS
- Final video is 30 seconds or less, vertical 1080x1920, H.264 + AAC .mp4.
- Never use real user accounts or real data. Use only the built-in demo account
  (username `demo`, password `demo`) or the "Show me around" button on the home page.
- Do not type or reveal any other credentials. Do not commit video or screenshot files.
- Narration must sound natural and human: no dashes used as asides, no hype words.

STEPS
1. Open the app in a browser at mobile width (375x812). Signed out, capture the home page.
2. Sign in as `demo`/`demo` (or start the tour). Capture, as separate screenshots:
   course overview; a lesson's Scripture box (crop clear of the sticky Voice bar);
   River 1 practice, income impact calculator on the Debt tab (snowball result visible);
   a river quiz; the certificate page. Save them to `tools/walkthrough/shots/`
   as home, course, scripture, snowball, quiz, certificate (.jpg).
3. Edit `tools/walkthrough/storyboard.json` if the beats, captions, or narration need
   to change. Keep total narration to about 65 words so it fits in 30 seconds.
4. Run `python3 tools/walkthrough/build.py`. It narrates with macOS `say`, renders
   frames with Pillow, and encodes with Swift/AVFoundation (no ffmpeg). It
   automatically speeds the voice up until the video fits `maxSeconds`.
5. Verify: duration <= 30s (`mdls -name kMDItemDurationSeconds out/four-rivers-30s.mp4`),
   1080x1920, audio track present. Open a few frames and confirm nothing is cut off,
   no personal data is visible, and captions don't overlap the app card.
6. Report the output path `tools/walkthrough/out/four-rivers-30s.mp4`.

Requirements: macOS, Python 3 with Pillow, Xcode command line tools (`swift`).
To use a human voiceover instead, record it to match the beats and replace the
`say` step.
