import { Colors } from '@/src/theme/colors';
import { Text, TextProps } from 'react-native';

export function Title(props: TextProps) {
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: 'InterSemiBold',
          fontSize: 24,
          color: Colors.textPrimary,
        },
        props.style,
      ]}
    />
  );
}

export function Body(props: TextProps) {
  return (
    <Text
      {...props}
      style={[
        {
          fontFamily: 'Inter',
          fontSize: 16,
          color: Colors.textSecondary,
        },
        props.style,
      ]}
    />
  );
}
