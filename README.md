# Bass Drop Detector

## Log

I've tried hard to try and detect bass drops, but it's a very difficult problem.

I tried

- noise floor
- squared sum of the 1/4th of the frequencies

but those don't adapt to songs with different bass levels, so I tried

- a sliding average of the squared sum of the 1/4th of the frequencies, and then a relative difference between the current value and the average

and that still didn't work. I'm not sure how to detect this.
