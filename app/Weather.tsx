'use client';

import { useState } from 'react';
import { getWeatherInfo } from './actions';

export function Weather() {
  let [weather, setWeather] = useState<string | null>(null);
  async function handleSubmit(formData: FormData) {
    const city = formData.get('city') as string;
    const result = await getWeatherInfo(city);
    // Handle the result
    console.log(result);
    setWeather(result.text);
  }

  return (
    <form action={handleSubmit}>
      <input
        name="city"
        placeholder="Enter city name"
        className="border border-gray-600 rounded-lg p-2 mr-2"
      />
      <button type="submit" className="border border-gray-600 rounded-lg p-2">
        Get Weather
      </button>
      <div>{weather}</div>
    </form>
  );
}
