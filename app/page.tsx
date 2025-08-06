import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, FileText, Shield, Zap, Lightbulb, List } from "lucide-react";
import { pagePath, apiPath } from "@/lib/utils/path-utils";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-20 pb-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            VVG World Pain Points Platform
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Share your pain points to help make VVG even better. 
            Every pain point helps us improve and build our future together.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href={pagePath("/ideas")}>
              <Button size="lg" className="gap-2">
                <Lightbulb className="w-4 h-4" />
                Submit a Pain Point
              </Button>
            </Link>
            <Link href={pagePath("/submissions")}>
              <Button size="lg" variant="outline" className="gap-2">
                <List className="w-4 h-4" />
                View Submissions
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Share Your Pain Points</h3>
            <p className="text-gray-600">
              Submit pain points to improve VVG operations, safety, and efficiency
            </p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
            <p className="text-gray-600">
              Follow your pain points from submission through review to resolution
            </p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Make an Impact</h3>
            <p className="text-gray-600">
              See your pain points resolved and help shape the future of VVG
            </p>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="max-w-3xl mx-auto">
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                <div>
                  <h3 className="font-semibold text-lg">Submit Your Pain Point</h3>
                  <p className="text-gray-600">Fill out a simple form with your pain point details and category</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                <div>
                  <h3 className="font-semibold text-lg">Automatic Routing</h3>
                  <p className="text-gray-600">Your pain point is automatically categorized and sent to the right department</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                <div>
                  <h3 className="font-semibold text-lg">Review & Resolution</h3>
                  <p className="text-gray-600">Track your pain point's progress as it moves through review to resolution</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 text-center text-gray-600">
        <p>VVG World - Building a better future together</p>
      </footer>
    </div>
  );
}