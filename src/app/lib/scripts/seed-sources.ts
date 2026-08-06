import dbConnect from "@/app/lib/db/connection";
import Source from "@/app/models/Source";

const DEFAULT_SOURCES = ["Facebook", "SEO"];

async function seedSources() {
  await dbConnect();

  for (const title of DEFAULT_SOURCES) {
    await Source.updateOne({ title }, { $setOnInsert: { title } }, { upsert: true });
  }

  console.log(`Seeded sources: ${DEFAULT_SOURCES.join(", ")}`);
}

seedSources()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
