import { describe, expect, it } from "vitest";
import jobs from "@/data/cpgis-jobs.json";
import {
  normalizeCountryDisplay,
  normalizeLocationDisplay,
  REQUIRED_COUNTRY_DISPLAY,
} from "@/lib/location-policy";

describe("country display policy", () => {
  it.each([
    ["Hong Kong", "Hong Kong SAR, China"],
    ["Hong Kong SAR, China", "Hong Kong SAR, China"],
    ["Macao", "Macau SAR, China"],
    ["Macau, China", "Macau SAR, China"],
    ["Taiwan", "Taiwai, China"],
    ["Taiwan, China", "Taiwai, China"],
  ])("normalizes %s to the required display", (input, expected) => {
    expect(normalizeCountryDisplay(input)).toBe(expected);
  });

  it("rebuilds the location label after country normalization", () => {
    expect(
      normalizeLocationDisplay({
        label: "Hong Kong, Hong Kong",
        city: "Hong Kong",
        country: "Hong Kong",
        latitude: 22.3,
        longitude: 114.2,
      }),
    ).toMatchObject({
      label: "Hong Kong, Hong Kong SAR, China",
      country: REQUIRED_COUNTRY_DISPLAY.hongKong,
    });
  });
});

describe("bundled institutional location overrides", () => {
  const institutionJobs = jobs.filter((job) =>
    [
      "the university of hong kong",
      "the chinese university of hong kong",
      "the hong kong polytechnic university",
    ].some((name) => job.organization.toLowerCase().includes(name)),
  );

  it("uses the exact required Hong Kong country display", () => {
    expect(institutionJobs.length).toBeGreaterThan(0);
    for (const job of institutionJobs) {
      expect(job.location.country).toBe("Hong Kong SAR, China");
      expect(job.location.label).toContain("Hong Kong SAR, China");
    }
  });

  it("keeps all verified coordinates inside Hong Kong's plausible range", () => {
    for (const job of institutionJobs) {
      expect(job.location.latitude).toBeGreaterThan(22);
      expect(job.location.latitude).toBeLessThan(23);
      expect(job.location.longitude).toBeGreaterThan(113);
      expect(job.location.longitude).toBeLessThan(115);
    }
  });

  it("does not collapse the three institutions onto one city-centre point", () => {
    const coordinatesByInstitution = new Map<string, string>();

    for (const job of institutionJobs) {
      const organization = job.organization.toLowerCase();
      const institution = organization.includes(
        "the chinese university of hong kong",
      )
        ? "cuhk"
        : organization.includes("the hong kong polytechnic university")
          ? "polyu"
          : "hku";
      const coordinates = `${job.location.latitude},${job.location.longitude}`;
      const existing = coordinatesByInstitution.get(institution);

      expect(existing === undefined || existing === coordinates).toBe(true);
      coordinatesByInstitution.set(institution, coordinates);
    }

    expect(coordinatesByInstitution.size).toBe(3);
    expect(new Set(coordinatesByInstitution.values()).size).toBe(3);
  });

  it("places University of York at its Heslington campus in the United Kingdom", () => {
    const universityOfYorkJobs = jobs.filter((job) =>
      job.organization.toLowerCase().includes("university of york"),
    );

    expect(universityOfYorkJobs.length).toBeGreaterThan(0);
    for (const job of universityOfYorkJobs) {
      expect(job.location).toMatchObject({
        city: "York",
        country: "United Kingdom",
        latitude: 53.9484189,
        longitude: -1.0535445,
      });
    }
  });

  it("does not confuse University of York with New York University", () => {
    const newYorkUniversityJobs = jobs.filter((job) =>
      job.organization.toLowerCase().includes("new york university"),
    );

    expect(newYorkUniversityJobs.length).toBeGreaterThan(0);
    for (const job of newYorkUniversityJobs) {
      expect(job.location.country).toBe("United States");
      expect(job.location.latitude).not.toBe(53.9484189);
      expect(job.location.longitude).not.toBe(-1.0535445);
    }
  });

  it("places University of Augsburg jobs in Augsburg, Germany", () => {
    const universityOfAugsburgJobs = jobs.filter((job) =>
      job.organization.toLowerCase().includes("university of augsburg"),
    );

    expect(universityOfAugsburgJobs.length).toBeGreaterThan(0);
    for (const job of universityOfAugsburgJobs) {
      expect(job.location).toMatchObject({
        label: "Augsburg, Germany",
        city: "Augsburg",
        country: "Germany",
        latitude: 48.37154,
        longitude: 10.89851,
      });
    }
  });

  it("places Aarhus University jobs at their reviewed campuses", () => {
    const expectedByApplicationUrl = new Map([
      ["https://bit.ly/4aTp5aH", "Aarhus"],
      ["https://bit.ly/49q5ONl", "Aarhus"],
      ["https://bit.ly/4pZdCLg", "Roskilde"],
      ["https://bit.ly/49ezxZU", "Aarhus"],
      ["https://bit.ly/4kZcHbr", "Aarhus"],
      ["https://bit.ly/44LF481", "Roskilde"],
      ["https://bit.ly/3YQSBYe", "Aarhus"],
      ["https://bit.ly/42JF1bE", "Aarhus"],
      ["https://bit.ly/3DBpFf6", "Roskilde"],
      ["https://bit.ly/43MrvT8", "Slagelse"],
      ["https://bit.ly/49OqLil", "Roskilde"],
      ["https://bit.ly/4aV1DHU", "Aarhus"],
      ["https://bit.ly/47cLPhu", "Herning"],
      ["https://bit.ly/48He5tB", "Aarhus"],
    ]);
    const aarhusJobs = jobs.filter((job) =>
      job.organization.toLowerCase().includes("aarhus university"),
    );

    expect(aarhusJobs).toHaveLength(expectedByApplicationUrl.size);
    for (const job of aarhusJobs) {
      const expectedCity = expectedByApplicationUrl.get(job.applicationUrl);
      expect(expectedCity).toBeDefined();
      expect(job.location).toMatchObject({
        label: `${expectedCity}, Denmark`,
        city: expectedCity,
        country: "Denmark",
      });
    }
  });

  it("places reviewed Western Sydney jobs at their stated campuses", () => {
    const expectedByApplicationUrl = new Map([
      ["https://bit.ly/4fNtsn5", ["Parramatta", -33.8178945, 151.0074062]],
      ["https://bit.ly/4fPegpy", ["Parramatta", -33.809094, 151.02753]],
    ] as const);

    for (const [applicationUrl, [city, latitude, longitude]] of expectedByApplicationUrl) {
      const job = jobs.find((candidate) => candidate.applicationUrl === applicationUrl);
      expect(job).toBeDefined();
      expect(job?.location).toMatchObject({
        label: `${city}, Australia`,
        city,
        country: "Australia",
        latitude,
        longitude,
      });
    }
  });

  it("places the Texas A&M fisheries job in College Station", () => {
    const job = jobs.find(
      (candidate) => candidate.applicationUrl === "https://bit.ly/40NGegy",
    );

    expect(job).toBeDefined();
    expect(job?.location).toMatchObject({
      label: "College Station, United States",
      city: "College Station",
      country: "United States",
      latitude: 30.6108618,
      longitude: -96.3520606,
    });
  });

  it.each(
    [
      ["Cornell University", ["cornell university"], "Ithaca", "United States", 42.452916, -76.4800635],
      ["University of Victoria Geography", ["department of geography, university of victoria"], "Victoria", "Canada", 48.464991, -123.314226],
      ["ENS Paris Geosciences", ["department of geoscience, ecole normale supérieure (ens)"], "Paris", "France", 48.84252, 2.34564],
      ["UCL CASA", ["bartlett centre for advanced spatial analysis"], "London", "United Kingdom", 51.5243894, -0.1374139],
      ["UCL Bartlett Architecture", ["bartlett school of architecture, university college london"], "London", "United Kingdom", 51.525885, -0.1326242],
      ["UCL CEGE", ["department of civil, environmental and geomatic engineering, university college london"], "London", "United Kingdom", 51.5240483, -0.1340167],
      ["Lancaster Medical School", ["lancaster medical school, lancaster university"], "Lancaster", "United Kingdom", 54.0099461, -2.787598],
      ["Nijmegen School of Management", ["nijmegen school of management, radboud university"], "Nijmegen", "The Netherlands", 51.8215173, 5.8634329],
      ["Newcastle University", ["newcastle university"], "Newcastle upon Tyne", "United Kingdom", 54.9801751, -1.6146802],
      ["University of Plymouth", ["university of plymouth"], "Plymouth", "United Kingdom", 50.3757001, -4.1393786],
      ["University of Washington Tacoma", ["university of washington tacoma"], "Tacoma", "United States", 47.2450762, -122.4397174],
      ["Queensland University of Technology", ["queensland university of technology"], "Brisbane", "Australia", -27.4773884, 153.0283366],
      ["INRAE UMR TETIS", ["research unit of sensor and remote sensing, the french national research institute for agriculture, food, and environment"], "Montpellier", "France", 43.645311, 3.8767479],
      ["LIENSs UMR 7266", ["research unit of littoral, environment and societies"], "La Rochelle", "France", 46.142485, -1.1572395],
      ["LIVE UMR 7362", ["image, city, and environment laboratory"], "Strasbourg", "France", 48.5841199, 7.7715898],
      ["IDEES UMR 6266", ["umr 6266 idees center"], "Mont-Saint-Aignan", "France", 49.458834, 1.0676735],
      ["CNRS@CREATE", ["cnrs@create"], "Singapore", "Singapore", 1.3035244, 103.773937],
      ["University College Dublin", ["university college dublin"], "Dublin", "Ireland", 53.3068499, -6.2246268],
      ["Chalmers University of Technology", ["chalmers university of technology"], "Gothenburg", "Sweden", 57.6897462, 11.9765259],
      ["University of Amsterdam", ["university of amsterdam"], "Amsterdam", "The Netherlands", 52.3681334, 4.8898042, ["free university of amsterdam"]],
      ["University of Vienna", ["university of vienna"], "Vienna", "Austria", 48.2131278, 16.3606855],
      ["Potsdam Institute for Climate Impact Research", ["potsdam institute for climate impact research", "postdam institute for climate impact research"], "Potsdam", "Germany", 52.3806374, 13.0642063],
      ["Leibniz Institute for Baltic Sea Research", ["leibniz institute for baltic sea research"], "Rostock", "Germany", 54.1795499, 12.0817229],
      ["Alfred Wegener Institute", ["alfred wegener institute"], "Bremerhaven", "Germany", 53.5332936, 8.5801243],
      ["ETH Zurich", ["federal institute of technology zurich (eth zurich)", "eth zurich"], "Zurich", "Switzerland", 47.3764545, 8.5481666],
      ["University at Buffalo", ["university at buffalo"], "Buffalo", "United States", 42.9533636, -78.8185843],
      ["University of Gothenburg", ["university of gothenburg", "university of gotherburg"], "Gothenburg", "Sweden", 57.6845012, 11.9637212],
      ["University of Bergen", ["university of bergen"], "Bergen", "Norway", 60.381012, 5.331927],
      ["Northeastern University", ["northeastern university"], "Boston", "United States", 42.3351065, -71.0892575],
      ["University of St. Gallen", ["university of st. gallen", "university of st gallen"], "St. Gallen", "Switzerland", 47.4300025, 9.3722184],
      ["UT Southwestern Medical Center", ["university of texas southwestern medical center", "ut southwestern medical center"], "Dallas", "United States", 32.812043, -96.8417201],
      ["University of Oxford", ["department of biology and school of geography and the environment"], "Oxford", "United Kingdom", 51.7589986, -1.2517095],
      ["University of Toronto Mississauga", ["department of geography, geomatics and environment"], "Mississauga", "Canada", 43.5502208, -79.6626584],
      ["Rutgers CAIT", ["center for advanced infrastructure and transportation, rutgers university"], "Piscataway", "United States", 40.5215445, -74.4650785],
      ["OpenGeoHub Foundation", ["opengeohub foundation"], "Doorwerth", "The Netherlands", 51.9796465, 5.8016545],
      ["Leibniz ZMT", ["leibniz centre for tropical marine research"], "Bremen", "Germany", 53.1078984, 8.8460396],
      ["Royal Geographical Society", ["area @rgs_ibg"], "London", "United Kingdom", 51.5013114, -0.1752543],
      ["LETG Rennes", ["research unit of coastline, environment, remote sensing, geomatics"], "Rennes", "France", 48.1193249, -1.7014997],
      ["UMR 5600 EVS", ["research unit of environment city society"], "Lyon", "France", 45.7493031, 4.8378288],
      ["UMR CNRS 5805 EPOC", ["laboratory of oceanic, continental environments and paleoenvironments"], "Pessac", "France", 44.8040222, -0.6081499],
    ] satisfies Array<
      [string, string[], string, string, number, number, string[]?]
    >,
  )(
    "places all %s records at the reviewed institution location",
    (_name, aliases, city, country, latitude, longitude, excludedAliases = []) => {
      const matchingJobs = jobs.filter((job) =>
        aliases.some((alias) => job.organization.toLowerCase().includes(alias)) &&
        !excludedAliases.some((alias) =>
          job.organization.toLowerCase().includes(alias),
        ),
      );

      expect(matchingJobs.length).toBeGreaterThan(0);
      for (const job of matchingJobs) {
        expect(job.location).toMatchObject({
          label: `${city}, ${country}`,
          city,
          country,
          latitude,
          longitude,
        });
      }
    },
  );
});
