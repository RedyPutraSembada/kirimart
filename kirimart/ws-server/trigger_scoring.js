import { scoringQueue } from "./src/jobs/worker.js";

async function run() {
    console.log("Triggering manual Fair Rank recalculation...");
    await scoringQueue.add("recalculate-scores", { manual: true });
    console.log("Job added to queue!");
    setTimeout(() => process.exit(0), 1000);
}
run();
