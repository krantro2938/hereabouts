/**
 * Sample memories for the demo. The storytellers are fictional; the places and the public
 * events they mention (Hoog Catharijne opening, the Catharijnesingel being filled in and
 * reopened, the Amelisweerd protests, Vredenburg music centre) are real Utrecht history.
 * Every sample is flagged `isSample` and labelled "Sample story" in the UI.
 */

export type SampleStory = {
	key: string;
	teller: string;
	title: string;
	summary: string;
	body: string;
	place: string;
	lat: number;
	lng: number;
	decade: number;
	year: number | null;
	tags: string[];
	visibility?: "public" | "circle";
	/** Wikimedia Commons file the seed downloads as the photo of the place */
	photo?: { title: string };
};

export type SampleTeller = {
	key: string;
	name: string;
	relation: string;
	bornYear: number;
	bio: string;
	owner: "daan" | "project";
	voice: string;
};

export const TELLERS: SampleTeller[] = [
	{
		key: "ria",
		name: "Ria van Dam",
		relation: "Daan’s grandmother",
		bornYear: 1938,
		bio: "Grew up above her father’s workshop near the Oudegracht. Worked forty years in a haberdashery and still knows every shopkeeper’s name.",
		owner: "daan",
		voice: "gb_jane_neutral",
	},
	{
		key: "kees",
		name: "Kees Hoogland",
		relation: "neighbour on the Amsterdamsestraatweg",
		bornYear: 1945,
		bio: "Fitter at the Werkspoor works in Zuilen for twenty-two years. Cycles to the Vecht every morning, rain or not.",
		owner: "project",
		voice: "gb_oliver_neutral",
	},
	{
		key: "fatima",
		name: "Fatima El Amrani",
		relation: "runs the fabric shop on Kanaalstraat",
		bornYear: 1956,
		bio: "Came to Lombok in 1974. Has sewn wedding dresses for three generations of the same families.",
		owner: "project",
		voice: "gb_jane_curious",
	},
	{
		key: "annie",
		name: "Annie de Wit",
		relation: "oldest member of the Tolsteeg reading club",
		bornYear: 1929,
		bio: "Daughter of a barge skipper on the Vaartsche Rijn. Taught at the same primary school for thirty-one years.",
		owner: "project",
		voice: "gb_jane_sad",
	},
	{
		key: "joost",
		name: "Joost Verbeek",
		relation: "moved to Leidsche Rijn as a boy",
		bornYear: 1993,
		bio: "Grew up in one of the first streets of Leidsche Rijn, when it was mostly sand and cranes.",
		owner: "project",
		voice: "en_paul_neutral",
	},
];

export const STORIES: SampleStory[] = [
	{
		key: "annie-barge",
		teller: "annie",
		title: "My father’s barge on the Vaartsche Rijn",
		summary:
			"Annie remembers growing up on her father’s barge, moored where the Vaartsche Rijn meets the city.",
		body: "We lived on the water until I was nine. My father carried sand and bricks, and when we were moored by the Ledig Erf my mother hung the washing between the mast and the wheelhouse.\n\nIn the mornings I climbed over three other boats to get to the quay, with my school bag held high so it wouldn’t get wet. The skippers’ wives would shout at me to be careful, and then give me a biscuit.\n\nAt night you could hear the water knocking against the hull. I still can’t sleep properly in a house that doesn’t move a little.",
		place: "Ledig Erf, Utrecht",
		lat: 52.081,
		lng: 5.1241,
		decade: 1930,
		year: 1937,
		tags: ["barge", "childhood", "water"],
		photo: { title: "File:Utrecht Tolsteegsingel.jpg" },
	},
	{
		key: "annie-skating",
		teller: "annie",
		title: "Skating on the frozen Singel",
		summary:
			"Annie remembers the winter the Singel froze hard enough to skate around the old city.",
		body: "There was one winter the whole Singel froze, all the way round. Somebody’s uncle set up a little stall on the ice selling hot milk with anise, and we skated from the Tolsteegbrug almost to the Weerdsluis before our feet gave up.\n\nI had my brother’s old skates, two sizes too big, stuffed with newspaper. I fell more than I skated. But I remember looking up at the trees on the bank, all white, and thinking the city had been turned into a postcard just for us.",
		place: "Tolsteegsingel, Utrecht",
		lat: 52.0829,
		lng: 5.1269,
		decade: 1940,
		year: 1947,
		tags: ["winter", "skating", "singel"],
		photo: {
			title: "File:Weerdsingel vanaf Westerbrug - Utrecht - 20212277 - RCE.jpg",
		},
	},
	{
		key: "ria-wharf",
		teller: "ria",
		title: "Hide and seek in the wharf cellars",
		summary:
			"Ria remembers playing in the cellars along the Oudegracht, below the street.",
		body: "The cellars along the Oudegracht were our kingdom. Down by the water they were storerooms then, full of barrels and coal and sacks of I don’t know what. Nobody was supposed to go in, so of course we did.\n\nWe played hide and seek in the dark with one candle between six of us. Once Jantje hid so well we went home without him. His mother came knocking at nine o’clock. He was asleep on a pile of sacks, perfectly happy.\n\nNow they are all cafés with little tables by the water. When I sit there I always look at the back wall and think, I know what you used to smell like.",
		place: "Oudegracht wharf, Utrecht",
		lat: 52.0898,
		lng: 5.1208,
		decade: 1940,
		year: 1946,
		tags: ["cellars", "childhood", "oudegracht"],
		photo: { title: "File:Stadsgezichten Utrecht, Bestanddeelnr 906-2556.jpg" },
	},
	{
		key: "ria-bakery",
		teller: "ria",
		title: "Saturday bread on the Twijnstraat",
		summary:
			"Ria remembers being sent for bread every Saturday and never bringing home the whole loaf.",
		body: "Every Saturday my mother sent me to the bakery on the Twijnstraat with exact money in a handkerchief. The baker’s wife had arms like a wrestler and she always said, ‘For your mother, the white one, not too dark.’\n\nThe loaf was still warm. And I could never get home without eating the end off. Never. My mother would look at the bread, look at me, and say nothing. Later I found out she did exactly the same thing when she was a girl.\n\nThe bakery is a phone shop now. But on a Saturday morning, if the wind is right, the street still smells of bread from somewhere.",
		place: "Twijnstraat, Utrecht",
		lat: 52.083,
		lng: 5.1235,
		decade: 1950,
		year: 1953,
		tags: ["bakery", "saturday", "family"],
		photo: {
			title: "File:Twijnstraat 65, 67, 69 en 71, Utrecht, augustus 2024.jpg",
		},
	},
	{
		key: "ria-dance",
		teller: "ria",
		title: "The dance where I met Wim",
		summary:
			"Ria remembers meeting her husband Wim at a dance near Vredenburg.",
		body: "There was a dance hall just off Vredenburg, upstairs, with a floor that bounced when everyone jumped. My friend Truus dragged me there. I didn’t want to go, I had a cold.\n\nWim asked me to dance three times and I said no three times. The fourth time he came back with a glass of lemonade for my cold, and I thought, well, he’s persistent, I’ll give him that.\n\nWe were married fifty-one years. He still couldn’t dance. Not one step. But he always came back with the lemonade.",
		place: "Vredenburg, Utrecht",
		lat: 52.0929,
		lng: 5.1148,
		decade: 1960,
		year: 1961,
		tags: ["dancing", "love", "vredenburg"],
		photo: {
			title:
				"File:Opgravingen kasteel op Vreeburg in Utrecht, Bestanddeelnr 928-6196.jpg",
		},
		visibility: "circle",
	},
	{
		key: "kees-werkspoor",
		teller: "kees",
		title: "The whistle at Werkspoor",
		summary:
			"Kees remembers the shift whistle at the Werkspoor works in Zuilen.",
		body: "Half of Zuilen worked at Werkspoor, and the other half was married to someone who did. At a quarter to seven the whistle went, and the whole Amsterdamsestraatweg was suddenly full of bicycles, all going the same way, like a river.\n\nI started there at sixteen, carrying tools for an old fitter called Bertus who had no patience and a heart of gold. He taught me to listen to a machine before you touch it. A machine tells you what is wrong, he said, if you shut up long enough.\n\nThe works are gone now, there are houses. But I still wake up at a quarter to seven.",
		place: "Zuilen, Utrecht",
		lat: 52.11,
		lng: 5.088,
		decade: 1960,
		year: 1962,
		tags: ["work", "factory", "zuilen"],
		photo: {
			title:
				"File:Werknemers verzamelen zich bij de poort, Bestanddeelnr 919-6762.jpg",
		},
	},
	{
		key: "kees-singel",
		teller: "kees",
		title: "When they filled in the Catharijnesingel",
		summary:
			"Kees remembers watching part of the Catharijnesingel being filled in for a road.",
		body: "They said the city needed a big road, so they filled in the canal. Just like that. I stood on the bank with my father watching the sand go in, and he said, they will be sorry about this one day.\n\nAt the time I thought it was exciting, all those machines. Afterwards it was cars, four lanes of them, and the trees were gone, and the water was gone, and nobody went for a walk there any more.\n\nMy father has been dead a long time. But he was right. They dug it out again, years later. I went to look and I thought, Pa, you should have seen this.",
		place: "Catharijnesingel, Utrecht",
		lat: 52.0879,
		lng: 5.116,
		decade: 1970,
		year: 1972,
		tags: ["canal", "road", "change"],
		photo: {
			title:
				"File:Catharijnesingel bij Tolsteegbrug - Utrecht - 20212263 - RCE.jpg",
		},
	},
	{
		key: "ria-hoogcatharijne",
		teller: "ria",
		title: "The first day of Hoog Catharijne",
		summary:
			"Ria remembers the opening of Hoog Catharijne and getting lost inside it.",
		body: "When Hoog Catharijne opened, the whole city went to look. Shops under one roof, escalators, music from the ceiling. It felt like America.\n\nI took my mother, who was nearly seventy then. She held onto my arm on the escalator as if it was a ship in a storm. We got completely lost and came out at the railway station when we wanted the Vredenburg side. She laughed so hard she had to sit on a bench.\n\nShe said, in my day a shop had a door and a bell. That was enough.",
		place: "Hoog Catharijne, Utrecht",
		lat: 52.0907,
		lng: 5.1134,
		decade: 1970,
		year: 1973,
		tags: ["shopping", "mother", "modern"],
		photo: {
			title:
				"File:Hoog-Catharijne, bouw-werkzaamheden, Bestanddeelnr 926-6954.jpg",
		},
	},
	{
		key: "fatima-arrival",
		teller: "fatima",
		title: "The first winter in Lombok",
		summary:
			"Fatima remembers arriving in Lombok in 1974 and the neighbour who brought her a coat.",
		body: "I arrived in November with a summer coat, because nobody told me. The first morning I opened the door on the Kanaalstraat and the cold went straight through me.\n\nOur neighbour, Mevrouw Bos, saw me shivering on the step. She didn’t speak a word of Arabic and I didn’t speak a word of Dutch. She went inside and came back with a big green coat that smelled of mothballs and put it on me like I was her daughter.\n\nI wore that coat for six winters. When she died I went to the funeral in it. Her son recognised it and he cried.",
		place: "Kanaalstraat, Utrecht",
		lat: 52.0913,
		lng: 5.1007,
		decade: 1970,
		year: 1974,
		tags: ["arrival", "neighbours", "lombok"],
		photo: { title: "File:Kanaalstraat Utrecht (9192192628).jpg" },
	},
	{
		key: "kees-amelisweerd",
		teller: "kees",
		title: "Sleeping in the trees at Amelisweerd",
		summary:
			"Kees remembers joining the protests against the motorway through the Amelisweerd woods.",
		body: "When they wanted to put the motorway through Amelisweerd, people went and lived in the woods to stop it. I was thirty-seven, with two kids, not exactly a revolutionary. But my son was twelve and he wanted to go, so we went.\n\nWe brought soup in a big pan on the back of the bike. There were students sleeping on platforms in the trees, old ladies knitting by the fire, a man playing the accordion. It was the friendliest place I have ever been.\n\nIn the end the road came anyway. But my son still says it was the day he learned that you can stand up for a tree.",
		place: "Amelisweerd, Utrecht",
		lat: 52.0732,
		lng: 5.1559,
		decade: 1980,
		year: 1982,
		tags: ["protest", "woods", "family"],
		photo: {
			title: "File:Demonstranten in het bos, Bestanddeelnr 932-3309.jpg",
		},
	},
	{
		key: "fatima-shop",
		teller: "fatima",
		title: "Opening the fabric shop",
		summary:
			"Fatima remembers opening her own fabric shop on the Kanaalstraat.",
		body: "I saved for nine years to open the shop. Nine years of sewing at the kitchen table at night after the children were asleep.\n\nThe first day, nobody came in. Not one person. I sat behind the counter and thought, what have I done. At four o’clock Mevrouw Bos’s daughter came in and bought two metres of blue cotton she didn’t need. Then she told her friends.\n\nI still have that first receipt in a frame. Two metres, blue. It is the most important thing in the shop.",
		place: "Kanaalstraat, Utrecht",
		lat: 52.091,
		lng: 5.0985,
		decade: 1980,
		year: 1983,
		tags: ["shop", "work", "lombok"],
		photo: { title: "File:Utrecht-Lombok - Kanaalstraat.jpg" },
	},
	{
		key: "fatima-griftpark",
		teller: "fatima",
		title: "The summer the gasworks became a park",
		summary:
			"Fatima remembers the first summers in the Griftpark, on the old gasworks land.",
		body: "That ground was the gasworks for as long as anyone remembered, fenced and dirty, and the soil was poisoned. Then they cleaned it and made the Griftpark and suddenly everyone had somewhere to go.\n\nThe first hot summer my daughters spent every evening there. Turkish families, Dutch families, students with guitars, all on the grass. I brought mint tea in a flask and ended up pouring for half the park.\n\nWhen I walk there now I think, a place can be forgiven. It just needs people to come and sit on it.",
		place: "Griftpark, Utrecht",
		lat: 52.1009,
		lng: 5.1265,
		decade: 1990,
		year: null,
		tags: ["park", "summer", "community"],
		photo: {
			title: "File:Verrichten van metingen, Bestanddeelnr 932-4547.jpg",
		},
	},
	{
		key: "joost-sand",
		teller: "joost",
		title: "Growing up on a building site",
		summary:
			"Joost remembers moving into one of the first streets of Leidsche Rijn, when it was mostly sand.",
		body: "When we moved in there were three finished streets and the rest was sand. Real sand, like a beach, with cranes instead of the sea.\n\nAll the kids from the new houses played on the building sites after the workers went home, which we absolutely were not allowed to do. We built forts from leftover pallets and named the sand hills after mountains. The biggest one was Everest.\n\nEverest is a school now. My little cousin goes there. I told him he’s sitting on a mountain and he looked at me like I was crazy.",
		place: "Leidsche Rijn, Utrecht",
		lat: 52.0966,
		lng: 5.0687,
		decade: 2000,
		year: 2001,
		tags: ["childhood", "new town", "building"],
		photo: { title: "File:2002-04-27 Edah aan de Langerakbaan.jpg" },
	},
	{
		key: "joost-water",
		teller: "joost",
		title: "The day the water came back",
		summary:
			"Joost remembers the Catharijnesingel being filled with water again after decades as a road.",
		body: "My grandfather always talked about the canal that used to be where the big road was. I thought it was one of his stories, honestly.\n\nThen they took the road out and let the water back in. I went with him to see it. He was in a wheelchair by then. He didn’t say anything for a long time, he just watched the water. Then he said, ‘Good. That’s right again.’\n\nNow I eat my lunch there on the steps by the water, and every time a boat goes past I think of him.",
		place: "Catharijnesingel, Utrecht",
		lat: 52.0886,
		lng: 5.1153,
		decade: 2020,
		year: 2020,
		tags: ["canal", "grandfather", "change"],
		photo: {
			title: "File:De vernieuwde Catharijnesingel in de stad Utrecht.jpg",
		},
	},
	{
		key: "ria-music",
		teller: "ria",
		title: "Wim falling asleep at the Vredenburg concert",
		summary:
			"Ria remembers taking Wim to a concert at the new Vredenburg music centre.",
		body: "When the new music centre opened at Vredenburg, I bought two tickets for Wim’s birthday. A whole symphony. I was so proud.\n\nHe fell asleep in the second movement. Not quietly either. The lady next to us kept looking. I nudged him and he woke up and clapped, in the middle, all alone.\n\nWe laughed about it for thirty years. Every time there was music on the radio he’d start clapping at the wrong moment just to make me laugh.",
		place: "Vredenburg, Utrecht",
		lat: 52.0925,
		lng: 5.1128,
		decade: 1970,
		year: 1979,
		tags: ["music", "love", "vredenburg"],
		photo: {
			title: "File:Interieur van het Muziekcentrum Vredenburg - Grote Zaal.jpg",
		},
		visibility: "circle",
	},
];

/** Make a speech-like verbatim transcript from the tidy story (fillers, false starts). */
export function toTranscript(body: string): string {
	const fillers = ["Well, ", "So, uh, ", "Yes, ", "Oh, ", ""];
	return body
		.split("\n\n")
		.map(
			(p, i) =>
				`${fillers[i % fillers.length]}${p.replace(/\. /, ". Uh, ").replace(/, and /, ", and, and ")}`,
		)
		.join(" ");
}
