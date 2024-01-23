# update timestamp of format: "Built Thu Feb 16, 2023 - (08:36 PM)" using global installation of npm's replace-in-file
stamp=$(date +"%a %b %d, %Y - (%I:%M %p)")
echo $stamp
replace-in-file "/Built \w{3} \w{3} \d{1,2}, \d{4} - \(\d\d:\d\d (P|A)M\)/g" "Built $stamp" ./src/renderer/components/LandingPage/SystemInformation.vue --isRegex
