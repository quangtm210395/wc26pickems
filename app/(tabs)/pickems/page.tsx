import { Card } from "@/components/ui/card";

export default function Page() {
  return (
    <Card className="p-4">
      <h1 className="text-lg font-semibold">Pickems</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dự đoán đội thắng từng trận + bracket — sắp có ở milestone tới.
      </p>
    </Card>
  );
}
